import React, { useState } from 'react';
import { IntervalMetrics, AcousticAnalysisData } from '@/types';
import { copyMetricsToClipboard } from '@/lib/exportUtils';
import { downloadAudioSelectionAsWav } from '@/lib/audioUtils';
import { X, Activity, Clock, Zap, Volume2, BarChart2, Layers, Disc, Copy, Check, Download } from 'lucide-react';

interface AcousticInspectorProps {
  metrics: IntervalMetrics | null;
  selectedLabel: string | null;
  selectedRange: { start: number; end: number } | null;
  currentTime: number;
  hoverTime?: number | null;
  analysisData: AcousticAnalysisData | null;
  audioBuffer?: AudioBuffer | null;
  isLoading: boolean;
  onOpenSpectralSlice?: (time?: number) => void;
  onExportSelectedAudio?: (start: number, end: number, label?: string | null) => void;
  className?: string;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

export const AcousticInspector: React.FC<AcousticInspectorProps> = ({
  metrics,
  selectedLabel,
  selectedRange,
  currentTime,
  hoverTime = null,
  analysisData,
  audioBuffer,
  isLoading,
  onOpenSpectralSlice,
  onExportSelectedAudio,
  className,
  isMobileDrawer = false,
  onClose,
}) => {
  // カーソル点での瞬時値 (Praat Query: Get Pitch, Get Formants, Get Intensity)
  const queryTime = hoverTime !== null ? hoverTime : currentTime;

  const pointValues = React.useMemo(() => {
    if (!analysisData) return null;
    const { pitch, formants, intensity } = analysisData;

    // 最近傍インデックス探索
    const findClosest = (times: number[], t: number) => {
      let bestIdx = -1;
      let minDiff = 0.05; // 50ms以内
      for (let i = 0; i < times.length; i++) {
        const diff = Math.abs(times[i] - t);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const pIdx = findClosest(pitch.times, queryTime);
    const fIdx = findClosest(formants.times, queryTime);
    const iIdx = intensity ? findClosest(intensity.times, queryTime) : -1;

    const f0 = pIdx >= 0 ? pitch.values[pIdx] : null;
    const f1 = fIdx >= 0 ? formants.f1[fIdx] : null;
    const f2 = fIdx >= 0 ? formants.f2[fIdx] : null;
    const f3 = fIdx >= 0 ? formants.f3[fIdx] : null;
    const intVal = iIdx >= 0 && intensity ? intensity.values[iIdx] : null;

    // セミトーン (re 100Hz)
    const semitones = f0 ? (12 * Math.log2(f0 / 100)).toFixed(1) : null;

    return { f0, semitones, f1, f2, f3, intensity: intVal };
  }, [analysisData, queryTime]);

  const freqToNote = (freq: number | null | undefined): string | null => {
    if (!freq || freq <= 25) return null;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midi = 69 + 12 * Math.log2(freq / 440);
    const roundedMidi = Math.round(midi);
    const noteName = noteNames[((roundedMidi % 12) + 12) % 12];
    const octave = Math.floor(roundedMidi / 12) - 1;
    const cents = Math.round((midi - roundedMidi) * 100);
    const centsStr = cents !== 0 ? (cents > 0 ? `+${cents}¢` : `${cents}¢`) : '';
    return `${noteName}${octave}${centsStr ? ' ' + centsStr : ''}`;
  };

  const [copied, setCopied] = useState(false);
  const [audioExported, setAudioExported] = useState(false);

  const handleCopyTSV = async () => {
    if (!selectedRange) return;
    const ok = await copyMetricsToClipboard({
      selection: selectedRange,
      selectedLabel,
      metrics,
    });
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportWav = () => {
    if (!selectedRange) return;
    if (onExportSelectedAudio) {
      onExportSelectedAudio(selectedRange.start, selectedRange.end, selectedLabel);
    } else if (audioBuffer) {
      downloadAudioSelectionAsWav(audioBuffer, selectedRange.start, selectedRange.end, selectedLabel);
    }
    setAudioExported(true);
    setTimeout(() => setAudioExported(false), 2000);
  };

  return (
    <div
      className={
        className ||
        'w-64 flex-shrink-0 border-l-2 border-[#111111] bg-white flex flex-col h-full overflow-y-auto text-[#111111]'
      }
    >
      {/* Header */}
      <div className="h-10 px-3 border-b-2 border-[#111111] flex items-center justify-between bg-white flex-shrink-0">
        <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider text-[#111111]">
          <Activity className="w-3.5 h-3.5 text-[#E30613]" />
          <span>Acoustic Inspector</span>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <span className="text-[10px] text-[#E30613] font-bold font-mono tracking-wider">CALC...</span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 border border-[#e0e0e6] hover:bg-[#111111] hover:text-white transition-colors"
              title="閉じる"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3.5 flex-1">
        {/* Target Interval Card */}
        <div className="p-2.5 border-2 border-[#111111] bg-white">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#777780] mb-1">
            Target Interval
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-extrabold text-[#111111] font-mono tracking-tight">
              {selectedLabel !== null && selectedLabel !== ''
                ? '/' + selectedLabel + '/'
                : selectedRange
                ? '(無名区間)'
                : '未選択 (カーソルモード)'}
            </span>
            {selectedRange && (
              <span className="text-[10px] text-[#777780] font-mono font-medium">
                {selectedRange.start.toFixed(3)} - {selectedRange.end.toFixed(3)}s
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Spectral Slice, Copy TSV & Export WAV */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onOpenSpectralSlice?.(selectedRange ? (selectedRange.start + selectedRange.end) / 2 : queryTime)}
              className="py-1.5 px-2 border-2 border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1"
              title="Praat 互換の FFT パワースペクトルと LPC スペクトル包絡線を表示"
            >
              <Layers className="w-3.5 h-3.5 text-[#E30613]" />
              <span>断面</span>
            </button>

            <button
              onClick={handleCopyTSV}
              disabled={!selectedRange}
              className={`py-1.5 px-2 border-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 ${
                copied
                  ? 'bg-[#10b981] border-[#10b981] text-white'
                  : 'bg-white border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-30 disabled:border-[#e0e0e6] disabled:text-[#aaaaaf] disabled:hover:bg-white'
              }`}
              title="選択区間の全分析メトリクスをTSV形式でクリップボードにコピー（Excel/R貼付用）"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>TSV COPY</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleExportWav}
            disabled={!selectedRange || (!audioBuffer && !onExportSelectedAudio)}
            className={`w-full py-1.5 px-2 border-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 ${
              audioExported
                ? 'bg-[#10b981] border-[#10b981] text-white'
                : 'bg-white border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-30 disabled:border-[#e0e0e6] disabled:text-[#aaaaaf] disabled:hover:bg-white'
            }`}
            title="選択区間の音声を16-bit PCM WAVファイルとして切り出し保存 (Praat: Extract selected sound)"
          >
            {audioExported ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>WAV SAVED</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#E30613]" />
                <span>WAV 保存 (切り出し)</span>
              </>
            )}
          </button>
        </div>

        {selectedRange ? (
          <>
            {/* Duration */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-[#111111]" />
                  Duration
                </span>
                <span className="text-[9px] text-[#aaaaaf]">分節長</span>
              </div>
              <div className="flex items-baseline justify-between px-2.5 py-1.5 bg-[#f0f0f4] border border-[#e0e0e6] font-mono">
                <span className="text-sm font-bold text-[#111111]">
                  {metrics
                    ? metrics.duration_ms.toFixed(1) + ' ms'
                    : ((selectedRange.end - selectedRange.start) * 1000).toFixed(1) + ' ms'}
                </span>
                <span className="text-[10px] text-[#777780]">
                  {metrics
                    ? (metrics.duration_ms / 1000).toFixed(3) + ' s'
                    : (selectedRange.end - selectedRange.start).toFixed(3) + ' s'}
                </span>
              </div>
            </div>

            {/* F0 / Pitch */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center text-[#2563eb]">
                  <Zap className="w-3 h-3 mr-1" />
                  Fundamental (F0)
                </span>
                <span className="text-[9px] text-[#aaaaaf]">基本周波数</span>
              </div>
              <div className="p-2.5 bg-white border border-[#e0e0e6] border-l-2 border-l-[#2563eb] font-mono space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-[#777780] uppercase tracking-wider">Mean:</span>
                    {metrics?.mean_f0 && freqToNote(metrics.mean_f0) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/30" title="12平均律 音名・ピッチ">
                        {freqToNote(metrics.mean_f0)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-[#111111]">
                    {metrics?.mean_f0 ? metrics.mean_f0.toFixed(1) + ' Hz' : '--'}
                  </span>
                </div>
                {metrics?.min_f0 && metrics?.max_f0 && (
                  <div className="flex justify-between text-[10px] text-[#777780] border-t border-[#e0e0e6] pt-1 font-medium">
                    <span>Min: {metrics.min_f0.toFixed(1)} Hz</span>
                    <span>Max: {metrics.max_f0.toFixed(1)} Hz</span>
                  </div>
                )}
              </div>
            </div>

            {/* Formants */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center text-[#E30613]">
                  <BarChart2 className="w-3 h-3 mr-1" />
                  Formants (20-80%)
                </span>
                <span className="text-[9px] text-[#aaaaaf]">定常部共鳴</span>
              </div>
              <div className="p-2.5 bg-white border border-[#e0e0e6] border-l-2 border-l-[#E30613] font-mono space-y-2">
                {/* F1 */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#777780] uppercase tracking-wider font-semibold">F1 (舌高):</span>
                    <span className="font-extrabold text-[#E30613]">
                      {metrics?.f1 ? metrics.f1.toFixed(0) + ' Hz' : '--'}
                    </span>
                  </div>
                  {metrics?.f1 && (
                    <div className="mt-1 flex items-center justify-between text-[9px] text-[#777780]">
                      <span>狭[i,u]</span>
                      <div className="flex-1 mx-2 h-1 bg-[#f0f0f4] relative overflow-hidden border border-[#e0e0e6]">
                        <div
                          className="h-full bg-[#E30613]"
                          style={{
                            width: `${Math.max(5, Math.min(100, ((metrics.f1 - 250) / 600) * 100))}%`,
                          }}
                        />
                      </div>
                      <span>広[a]</span>
                    </div>
                  )}
                </div>

                {/* F2 */}
                <div className="border-t border-[#f0f0f4] pt-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#777780] uppercase tracking-wider font-semibold">F2 (舌前後):</span>
                    <span className="font-extrabold text-[#E30613]">
                      {metrics?.f2 ? metrics.f2.toFixed(0) + ' Hz' : '--'}
                    </span>
                  </div>
                  {metrics?.f2 && (
                    <div className="mt-1 flex items-center justify-between text-[9px] text-[#777780]">
                      <span>後[u,o]</span>
                      <div className="flex-1 mx-2 h-1 bg-[#f0f0f4] relative overflow-hidden border border-[#e0e0e6]">
                        <div
                          className="h-full bg-[#E30613]"
                          style={{
                            width: `${Math.max(5, Math.min(100, ((metrics.f2 - 800) / 1600) * 100))}%`,
                          }}
                        />
                      </div>
                      <span>前[i,e]</span>
                    </div>
                  )}
                </div>

                {/* F3 */}
                <div className="flex items-center justify-between text-xs border-t border-[#f0f0f4] pt-1.5">
                  <span className="text-[#777780] uppercase tracking-wider font-semibold">F3:</span>
                  <span className="font-bold text-[#111111]">
                    {metrics?.f3 ? metrics.f3.toFixed(0) + ' Hz' : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Spectral Moments (子音・摩擦音分析) */}
            {metrics?.spectral_moments && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                  <span className="flex items-center text-[#111111]">
                    <Disc className="w-3 h-3 mr-1" />
                    Spectral Moments
                  </span>
                  <span className="text-[9px] text-[#aaaaaf]">子音・摩擦音</span>
                </div>
                <div className="p-2 bg-[#f9f9fb] border border-[#e0e0e6] font-mono text-xs space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-[#777780] font-semibold" title="Centre of Gravity (重心周波数)">
                      COG (重心):
                    </span>
                    <span className="font-bold text-[#111111]">
                      {metrics.spectral_moments.cog} Hz
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[10px]">
                    <span className="text-[#777780]" title="Standard Deviation (標準偏差・広がり)">SD (分散):</span>
                    <span className="text-[#111111]">{metrics.spectral_moments.sd} Hz</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[10px] border-t border-[#e0e0e6] pt-1">
                    <span className="text-[#777780]" title="Skewness (歪度・非対称性)">Skew: {metrics.spectral_moments.skewness}</span>
                    <span className="text-[#777780]" title="Kurtosis (尖度・ピーク鋭さ)">Kurt: {metrics.spectral_moments.kurtosis}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Intensity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center text-[#10b981]">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Intensity
                </span>
                <span className="text-[9px] text-[#aaaaaf]">音圧強度</span>
              </div>
              <div className="p-2.5 bg-white border border-[#e0e0e6] border-l-2 border-l-[#10b981] font-mono space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#777780] uppercase tracking-wider">Mean:</span>
                  <span className="text-sm font-bold text-[#10b981]">
                    {metrics?.mean_intensity ? metrics.mean_intensity.toFixed(1) + ' dB' : '--'}
                  </span>
                </div>
                {metrics?.min_intensity && metrics?.max_intensity && (
                  <div className="flex justify-between text-[10px] text-[#777780] border-t border-[#e0e0e6] pt-1 font-medium">
                    <span>Min: {metrics.min_intensity.toFixed(1)} dB</span>
                    <span>Max: {metrics.max_intensity.toFixed(1)} dB</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Point Query Mode (Praat Query at Cursor) */
          <div className="space-y-3">
            <div className="p-2.5 bg-[#f9f9fb] border border-[#e0e0e6] font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-[#e0e0e6] pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#777780]">
                  Cursor Time:
                </span>
                <span className="font-extrabold text-[#111111]">
                  {queryTime.toFixed(3)} s
                </span>
              </div>

              {/* Instantaneous F0 */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] text-[#777780]">Pitch (F0):</span>
                  {pointValues?.f0 && freqToNote(pointValues.f0) && (
                    <span className="text-[9px] font-bold px-1 py-0.2 bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/30">
                      {freqToNote(pointValues.f0)}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#2563eb]">
                    {pointValues?.f0 ? `${pointValues.f0.toFixed(1)} Hz` : '--'}
                  </span>
                  {pointValues?.semitones && (
                    <span className="text-[10px] text-[#777780] ml-1">
                      ({pointValues.semitones} st)
                    </span>
                  )}
                </div>
              </div>

              {/* Instantaneous Formants */}
              <div className="space-y-1 border-t border-[#e0e0e6] pt-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#777780]">Formant F1:</span>
                  <span className="font-bold text-[#E30613]">
                    {pointValues?.f1 ? `${pointValues.f1.toFixed(0)} Hz` : '--'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#777780]">Formant F2:</span>
                  <span className="font-bold text-[#E30613]">
                    {pointValues?.f2 ? `${pointValues.f2.toFixed(0)} Hz` : '--'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#777780]">Formant F3:</span>
                  <span className="font-bold text-[#111111]">
                    {pointValues?.f3 ? `${pointValues.f3.toFixed(0)} Hz` : '--'}
                  </span>
                </div>
              </div>

              {/* Instantaneous Intensity */}
              <div className="flex items-baseline justify-between border-t border-[#e0e0e6] pt-1.5">
                <span className="text-[11px] text-[#777780]">Intensity:</span>
                <span className="font-bold text-[#10b981]">
                  {pointValues?.intensity ? `${pointValues.intensity.toFixed(1)} dB` : '--'}
                </span>
              </div>
            </div>

            <div className="text-left text-[#777780] text-[11px] font-mono leading-relaxed border border-dashed border-[#e0e0e6] p-2.5">
              波形やスペクトログラムをクリック・ホバーすると、瞬時値が計測されます。ドラッグして区間を選択すると統計値（平均・極値・モーメント）が表示されます。
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-[#e0e0e6] text-[10px] text-[#777780] bg-[#f0f0f4] flex justify-between items-center font-mono uppercase tracking-wider">
        <span>Praat Burg / AC</span>
        <span>Moments &amp; Query</span>
      </div>
    </div>
  );
};
