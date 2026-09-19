'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Square, Play, Pause, RotateCcw, Check, Volume2, AlertCircle } from 'lucide-react';
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

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('お使いのブラウザはマイク録音APIに対応していません。');
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
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'マイクへのアクセスが拒否されました。ブラウザのアドレスバーからマイク許可を有効にしてください。'
          : `マイクの初期化に失敗しました: ${err.message}`
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-xl shadow-2xl overflow-hidden text-gray-900 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 font-semibold text-gray-800 text-sm">
            <Mic className="w-4 h-4 text-red-600 animate-pulse" />
            <span>マイク録音（音響分析用PCM録音）</span>
          </div>
          <button
            onClick={() => {
              cleanupAudio();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start space-x-2 text-[11px] leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Level Meter Section */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-gray-600 font-medium">
              <span className="flex items-center">
                <Volume2 className="w-3.5 h-3.5 mr-1 text-gray-500" />
                マイク入力レベル (VUメーター)
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {permissionState === 'granted' ? 'マイク待機中' : 'マイク接続中...'}
              </span>
            </div>
            <div className="relative w-full h-4 rounded overflow-hidden border border-gray-300 bg-slate-900 shadow-inner">
              <canvas ref={canvasRef} width={380} height={16} className="w-full h-full block" />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 font-mono px-0.5">
              <span>-inf dB</span>
              <span>-12 dB</span>
              <span>-6 dB</span>
              <span className="text-red-500 font-semibold">0 dB (Clip)</span>
            </div>
          </div>

          {/* Center Record Area */}
          <div className="flex flex-col items-center justify-center py-4 bg-gray-50/60 rounded-lg border border-dashed border-gray-200">
            {/* Timer Display */}
            <div className="font-mono text-3xl font-bold tracking-wider text-gray-800 mb-2">
              {isRecording ? formatTimer(elapsedSeconds) : recordedDuration ? formatTimer(recordedDuration) : '00:00.0'}
            </div>

            {/* Status indicator */}
            <div className="flex items-center space-x-1.5 mb-4 text-xs font-medium">
              {isRecording ? (
                <span className="flex items-center text-red-600 font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600 mr-1.5" />
                  録音中...
                </span>
              ) : isProcessingWav ? (
                <span className="text-blue-600 animate-pulse">WAVフォーマット変換中...</span>
              ) : recordedWavFile ? (
                <span className="text-green-700 font-semibold flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  録音完了 ({recordedDuration?.toFixed(2)}s)
                </span>
              ) : (
                <span className="text-gray-500">ボタンを押して録音を開始</span>
              )}
            </div>

            {/* Record / Stop Button */}
            {!recordedWavFile ? (
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={permissionState !== 'granted' || isProcessingWav}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-4 ring-red-200'
                    : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'
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
                  className="flex items-center px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium shadow-2xs transition-colors"
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      停止
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
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
                  className="flex items-center px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                  再録音
                </button>
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-500 text-center leading-relaxed">
            ※ 録音された音声は自動的に 16-bit PCM WAV に変換され、Praat と同様の正確な波形・ピッチ・フォルマント解析が行われます。
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => {
              cleanupAudio();
              onClose();
            }}
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-colors"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleApplyRecording}
            disabled={!recordedWavFile || isRecording || isProcessingWav}
            className="flex items-center px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            分析エディタに読み込む
          </button>
        </div>
      </div>
    </div>
  );
};
