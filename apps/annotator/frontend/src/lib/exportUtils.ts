import { IntervalMetrics } from '@/types';

export interface ExportIntervalParams {
  selection: { start: number; end: number };
  selectedLabel?: string | null;
  metrics?: IntervalMetrics | null;
}

/**
 * Format interval and acoustic metrics into a tab-separated values (TSV) string.
 */
export function formatIntervalMetricsTSV({
  selection,
  selectedLabel,
  metrics,
}: ExportIntervalParams): string {
  const durMs = metrics ? metrics.duration_ms : (selection.end - selection.start) * 1000;

  const headers = [
    'Label',
    'Start(s)',
    'End(s)',
    'Duration(ms)',
    'Mean_F0(Hz)',
    'Min_F0(Hz)',
    'Max_F0(Hz)',
    'Mean_F1(Hz)',
    'Mean_F2(Hz)',
    'Mean_F3(Hz)',
    'Mean_Intensity(dB)',
    'Min_Intensity(dB)',
    'Max_Intensity(dB)',
    'COG(Hz)',
  ];

  const row = [
    selectedLabel || '',
    selection.start.toFixed(4),
    selection.end.toFixed(4),
    durMs.toFixed(2),
    metrics?.mean_f0 ? metrics.mean_f0.toFixed(1) : '',
    metrics?.min_f0 ? metrics.min_f0.toFixed(1) : '',
    metrics?.max_f0 ? metrics.max_f0.toFixed(1) : '',
    metrics?.f1 ? metrics.f1.toFixed(1) : '',
    metrics?.f2 ? metrics.f2.toFixed(1) : '',
    metrics?.f3 ? metrics.f3.toFixed(1) : '',
    metrics?.mean_intensity ? metrics.mean_intensity.toFixed(1) : '',
    metrics?.min_intensity ? metrics.min_intensity.toFixed(1) : '',
    metrics?.max_intensity ? metrics.max_intensity.toFixed(1) : '',
    metrics?.spectral_moments?.cog ? metrics.spectral_moments.cog.toFixed(1) : '',
  ];

  return `${headers.join('\t')}\n${row.join('\t')}`;
}

/**
 * Copy formatted interval metrics TSV to system clipboard.
 */
export async function copyMetricsToClipboard(params: ExportIntervalParams): Promise<boolean> {
  try {
    const tsv = formatIntervalMetricsTSV(params);
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Failed to copy metrics to clipboard:', err);
    return false;
  }
}
