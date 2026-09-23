'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Square, Play, Pause, RotateCcw, Check, Volume2, AlertCircle, Info } from 'lucide-react';
import { audioBufferToWavBlob } from '@/lib/audioUtils';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordComplete: (file: File) => Promise<void>;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onRecordComplete,
}) => {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTechNotes, setShowTechNotes] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState<number | null>(null);
  const [recordedWavFile, setRecordedWavFile] = useState<File | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isProcessingWav, setIsProcessingWav] = useState(false);

  // Audio Stream & Nodes Refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Canvas Ref for VU Meter
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peakHoldRef = useRef<number>(0);
  const peakDecayCounterRef = useRef<number>(0);

  // Timer Ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up all audio resources
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsPlayingPreview(false);
  }, []);

  // Request microphone access and start live level meter
  const startMicrophone = useCallback(async () => {
    cleanupAudio();
    setErrorMessage(null);

    // 非セキュア通信 (HTTP) の早期検知
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setPermissionState('denied');
      setErrorMessage(
        '【非セキュア環境】ブラウザのセキュリティ仕様により、マイク録音APIは HTTPS または localhost 接続でのみ利用可能です。HTTP接続ではPCM録音を行えません。'
      );
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('お使いのブラウザまたは環境はマイク録音API（getUserMedia）に対応していません。');
      }

      // 音声学分析用にエコーキャンセラーやノイズ抑制の自動歪みを最小化
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;
      setPermissionState('granted');

      // Live VU Meter setup with AudioContext
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser); // Do not connect to destination (avoids feedback loop)

      // Draw real-time VU Meter loop
      const pcmData = new Float32Array(analyser.fftSize);
      const drawMeter = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        analyserRef.current.getFloatTimeDomainData(pcmData);

        // RMS計算
        let sumSquares = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sumSquares += pcmData[i] * pcmData[i];
        }
        const rms = Math.sqrt(sumSquares / pcmData.length);
        // レベルを0~1に正規化 (微弱音も拾いやすいよう拡大)
        const rawLevel = Math.min(1, rms * 4.5);

        // ピークホールドの減衰計算
        if (rawLevel >= peakHoldRef.current) {
          peakHoldRef.current = rawLevel;
          peakDecayCounterRef.current = 20; // 20フレーム保持
        } else {
          if (peakDecayCounterRef.current > 0) {
            peakDecayCounterRef.current--;
          } else {
            peakHoldRef.current = Math.max(0, peakHoldRef.current - 0.02);
          }
        }

        // Canvas描画
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          // 背景目盛り
          ctx.fillStyle = '#1e293b'; // slate-800
          ctx.fillRect(0, 0, width, height);

          // メーターグラデーションバー
          const currentWidth = width * rawLevel;
          if (currentWidth > 0) {
            const grad = ctx.createLinearGradient(0, 0, width, 0);
            grad.addColorStop(0, '#22c55e');   // green-500
            grad.addColorStop(0.65, '#eab308'); // yellow-500
            grad.addColorStop(0.9, '#ef4444');  // red-500
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, currentWidth, height);
          }

          // ピークホールドバー (白線)
          if (peakHoldRef.current > 0.01) {
            const peakX = Math.min(width - 2, width * peakHoldRef.current);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(peakX, 0, 2, height);
          }
        }

        animationFrameRef.current = requestAnimationFrame(drawMeter);
      };

      drawMeter();
    } catch (err: any) {
      console.error('Microphone init error:', err);
      setPermissionState('denied');

      let userMsg = `マイクの初期化に失敗しました: ${err.message}`;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userMsg = 'マイクへのアクセスが拒否されました。ブラウザのアドレスバーの鍵アイコンからマイク使用を許可してください。';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userMsg = '録音可能なマイクデバイスが見つかりません。マイクが接続されているか確認してください。';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userMsg = 'マイクにアクセスできません。他のアプリケーション（Zoom、Teams、Discord等）でマイクが占有されていないかご確認ください。';
      }
      setErrorMessage(userMsg);
    }
  }, [cleanupAudio]);

  // Open modal -> init mic, Close modal -> cleanup
  useEffect(() => {
    if (isOpen) {
      setRecordedWavFile(null);
      setRecordedDuration(null);
      setIsRecording(false);
      setElapsedSeconds(0);
      startMicrophone();
    } else {
      cleanupAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [isOpen, startMicrophone, cleanupAudio]);

  // Start recording
  const handleStartRecording = () => {
    if (!streamRef.current) return;
    setRecordedWavFile(null);
    setRecordedDuration(null);
    audioChunksRef.current = [];

    try {
      // Chrome/Edge/Firefox support audio/webm;codecs=opus
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : '';

      const recorder = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsProcessingWav(true);
        try {
          const rawBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const arrayBuf = await rawBlob.arrayBuffer();

          // Decode using AudioContext to extract clean raw PCM
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          const decodeCtx = new AudioCtxClass();
          const audioBuffer = await decodeCtx.decodeAudioData(arrayBuf);
          await decodeCtx.close();

          // Convert to Praat-compatible 16-bit PCM standard WAV
          const wavBlob = audioBufferToWavBlob(audioBuffer);
          const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').slice(0, 15);
          const wavFile = new File([wavBlob], `record_${timestamp}.wav`, { type: 'audio/wav' });

          setRecordedWavFile(wavFile);
          setRecordedDuration(audioBuffer.duration);
        } catch (err: any) {
          console.error('Recording decode error:', err);
          setErrorMessage(`録音データの処理に失敗しました: ${err.message}`);
        } finally {
          setIsProcessingWav(false);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setElapsedSeconds(elapsed);
      }, 50);
    } catch (err: any) {
      setErrorMessage(`録音の開始に失敗しました: ${err.message}`);
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Toggle Preview playback
  const handleTogglePreview = () => {
    if (!recordedWavFile) return;

    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    const audioUrl = URL.createObjectURL(recordedWavFile);
    const audio = new Audio(audioUrl);
    previewAudioRef.current = audio;

    audio.onended = () => {
      setIsPlayingPreview(false);
    };

    audio.play();
    setIsPlayingPreview(true);
  };

  // Submit to workspace
  const handleApplyRecording = async () => {
    if (!recordedWavFile) return;
    cleanupAudio();
    await onRecordComplete(recordedWavFile);
  };

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/70 backdrop-blur-none p-4">
      <div className="w-full max-w-md bg-white border-2 border-[#111111] text-[#111111] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#111111] bg-white">
          <div className="flex items-center space-x-2 font-extrabold text-xs uppercase tracking-wider text-[#111111]">
            <Mic className="w-4 h-4 text-[#E30613]" />
            <span>マイク録音（音響分析用PCM録音）</span>
          </div>
          <button
            onClick={() => {
              cleanupAudio();
              onClose();
            }}
            className="text-[#111111] hover:bg-[#111111] hover:text-white border border-[#e0e0e6] hover:border-[#111111] p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-[#E30613]/10 border border-[#E30613] text-[#E30613] flex items-start space-x-2 text-[11px] leading-relaxed font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Level Meter Section */}
          <div className="bg-[#f9f9fb] p-3 border border-[#e0e0e6] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
              <span className="flex items-center">
                <Volume2 className="w-3.5 h-3.5 mr-1 text-[#111111]" />
                マイク入力レベル (VUメーター)
              </span>
              <span className="text-[10px] text-[#777780] font-mono">
                {permissionState === 'granted' ? 'STANDBY' : 'CONNECTING...'}
              </span>
            </div>
            <div className="relative w-full h-4 border border-[#111111] bg-[#111111]">
              <canvas ref={canvasRef} width={380} height={16} className="w-full h-full block" />
            </div>
            <div className="flex justify-between text-[9px] text-[#777780] font-mono px-0.5">
              <span>-INF DB</span>
              <span>-12 DB</span>
              <span>-6 DB</span>
              <span className="text-[#E30613] font-bold">0 DB (CLIP)</span>
            </div>
          </div>

          {/* Center Record Area */}
          <div className="flex flex-col items-center justify-center py-5 bg-[#f0f0f4] border border-[#e0e0e6]">
            {/* Timer Display */}
            <div className="font-mono text-3xl font-extrabold tracking-wider text-[#111111] mb-2">
              {isRecording ? formatTimer(elapsedSeconds) : recordedDuration ? formatTimer(recordedDuration) : '00:00.0'}
            </div>

            {/* Status indicator */}
            <div className="flex items-center space-x-1.5 mb-5 text-xs font-mono uppercase tracking-wider">
              {isRecording ? (
                <span className="flex items-center text-[#E30613] font-bold animate-pulse">
                  <span className="w-2 h-2 bg-[#E30613] mr-1.5" />
                  RECORDING IN PROGRESS...
                </span>
              ) : isProcessingWav ? (
                <span className="text-[#111111] font-bold animate-pulse">CONVERTING TO PCM WAV...</span>
              ) : recordedWavFile ? (
                <span className="text-[#111111] font-bold flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1 text-[#E30613]" />
                  READY ({recordedDuration?.toFixed(2)}s)
                </span>
              ) : (
                <span className="text-[#777780]">PRESS BUTTON TO START RECORDING</span>
              )}
            </div>

            {/* Record / Stop Button (Sharp Geometric Square) */}
            {!recordedWavFile ? (
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={permissionState !== 'granted' || isProcessingWav}
                className={`w-14 h-14 border-2 border-[#111111] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-[#E30613] text-white border-[#E30613] animate-pulse'
                    : 'bg-[#111111] text-white hover:bg-[#E30613] hover:border-[#E30613]'
                }`}
                title={isRecording ? '録音を停止' : '録音を開始'}
              >
                {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
              </button>
            ) : (
              /* Play / Re-record Buttons once recorded */
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleTogglePreview}
                  className="flex items-center px-3.5 py-1.5 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="w-3.5 h-3.5 mr-1.5" />
                      停止
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      試聴する
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (previewAudioRef.current) previewAudioRef.current.pause();
                    setIsPlayingPreview(false);
                    setRecordedWavFile(null);
                    setRecordedDuration(null);
                    setElapsedSeconds(0);
                  }}
                  className="flex items-center px-3.5 py-1.5 border border-[#e0e0e6] hover:border-[#111111] bg-white hover:bg-[#f0f0f4] text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#777780]" />
                  再録音
                </button>
              </div>
            )}
          </div>

          {/* Technical Notes / Compatibility Limitations Accordion */}
          <div className="border border-[#e0e0e6] bg-[#fafafa]">
            <button
              type="button"
              onClick={() => setShowTechNotes(!showTechNotes)}
              className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-[#111111] hover:bg-[#f0f0f4] transition-colors"
            >
              <span className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-[#E30613]" />
                <span>PCM録音の技術的制約・動作要件（補足）</span>
              </span>
              <span className="text-[10px] text-[#777780] font-mono flex items-center">
                {showTechNotes ? '閉じる ▲' : '詳細を見る ▼'}
              </span>
            </button>
            {showTechNotes && (
              <div className="px-3 pb-3 pt-1 border-t border-[#e0e0e6] text-[10px] text-[#44444a] space-y-2 leading-relaxed">
                <div>
                  <span className="font-bold text-[#111111] block">① HTTPS / localhost の必須要件:</span>
                  W3C セキュリティ仕様により、マイク録音は HTTPS または <code className="bg-[#e0e0e6] px-1 py-0.5">localhost</code> 接続でのみ動作します。非暗号化 HTTP 経由ではブラウザ側でマイク API が無効化されます。
                </div>
                <div>
                  <span className="font-bold text-[#111111] block">② Bluetooth 機器の帯域制限 (8kHz / 16kHz):</span>
                  AirPods などの無線ヘッドセットマイクは、Bluetooth 通話プロファイル（HFP）の制限により 8kHz または 16kHz に帯域制限されます。精密なフォルマント分析には <strong className="text-[#111111]">PC 内蔵マイクまたは有線 USB マイク</strong> をご使用ください。
                </div>
                <div>
                  <span className="font-bold text-[#111111] block">③ スマホ / OS 側の自動補正 (DSP) の介入:</span>
                  本アプリはノイズ抑制・エコーキャンセルを無効化する要求を出しますが、iOS (Safari) や一部スマホでは OS の通話処理が強制介入し、微弱な子音が削られる場合があります。生波形記録には PC（Chrome / Edge / Firefox）を推奨します。
                </div>
                <div>
                  <span className="font-bold text-[#111111] block">④ アプリ内ブラウザ（WebView）の制限:</span>
                  LINE、X (Twitter)、Instagram などのアプリ内ブラウザでは権限要求がブロックされることがあります。Safari や Chrome 等の標準ブラウザで開いてください。
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-[#777780] text-center font-mono leading-relaxed uppercase">
            AUTOMATICALLY ENCODED TO 16-BIT LINEAR PCM WAV (PRAAT COMPATIBLE)
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-4 py-3 border-t-2 border-[#111111] bg-white">
          <button
            type="button"
            onClick={() => {
              cleanupAudio();
              onClose();
            }}
            className="px-3.5 py-1.5 border border-[#e0e0e6] hover:border-[#111111] bg-white hover:bg-[#f0f0f4] text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleApplyRecording}
            disabled={!recordedWavFile || isRecording || isProcessingWav}
            className="flex items-center px-4 py-1.5 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            分析エディタに読み込む
          </button>
        </div>
      </div>
    </div>
  );
};
