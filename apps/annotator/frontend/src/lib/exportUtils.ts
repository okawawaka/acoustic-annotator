import { IntervalMetrics } from '@/types';

export interface ExportIntervalParams {
  selection: { start: number; end: number };
  selectedLabel?: string | null;
  metrics?: IntervalMetrics | null;
}

export interface TableExportRow {
  tierName: string;
  label: string;
  start: number;
  end: number;
  durationMs: number;
  meanF0: number | null;
  minF0: number | null;
  maxF0: number | null;
  f1: number | null;
  f2: number | null;
  f3: number | null;
  meanIntensity: number | null;
  cog: number | null;
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
 * Copy formatted single-interval metrics TSV to system clipboard.
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

/**
 * Format an array of table rows into TSV.
 */
export function formatTableRowsToTSV(rows: TableExportRow[]): string {
  const headers = [
    'Tier',
    'Label',
    'Start(s)',
    'End(s)',
    'Duration(ms)',
    'Mean_F0(Hz)',
    'Min_F0(Hz)',
    'Max_F0(Hz)',
    'F1(Hz)',
    'F2(Hz)',
    'F3(Hz)',
    'Mean_Intensity(dB)',
    'COG(Hz)',
  ];

  const lines = rows.map((r) => [
    r.tierName,
    r.label,
    r.start.toFixed(4),
    r.end.toFixed(4),
    r.durationMs.toFixed(1),
    r.meanF0 !== null ? r.meanF0.toFixed(1) : '',
    r.minF0 !== null ? r.minF0.toFixed(1) : '',
    r.maxF0 !== null ? r.maxF0.toFixed(1) : '',
    r.f1 !== null ? r.f1.toFixed(1) : '',
    r.f2 !== null ? r.f2.toFixed(1) : '',
    r.f3 !== null ? r.f3.toFixed(1) : '',
    r.meanIntensity !== null ? r.meanIntensity.toFixed(1) : '',
    r.cog !== null ? r.cog.toFixed(1) : '',
  ]);

  return [headers.join('\t'), ...lines.map((l) => l.join('\t'))].join('\n');
}

/**
 * Format an array of table rows into CSV with proper escaping.
 */
export function formatTableRowsToCSV(rows: TableExportRow[]): string {
  const headers = [
    'Tier',
    'Label',
    'Start_s',
    'End_s',
    'Duration_ms',
    'Mean_F0_Hz',
    'Min_F0_Hz',
    'Max_F0_Hz',
    'F1_Hz',
    'F2_Hz',
    'F3_Hz',
    'Mean_Intensity_dB',
    'COG_Hz',
  ];

  const escapeCsv = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = rows.map((r) =>
    [
      escapeCsv(r.tierName),
      escapeCsv(r.label),
      r.start.toFixed(4),
      r.end.toFixed(4),
      r.durationMs.toFixed(1),
      r.meanF0 !== null ? r.meanF0.toFixed(1) : '',
      r.minF0 !== null ? r.minF0.toFixed(1) : '',
      r.maxF0 !== null ? r.maxF0.toFixed(1) : '',
      r.f1 !== null ? r.f1.toFixed(1) : '',
      r.f2 !== null ? r.f2.toFixed(1) : '',
      r.f3 !== null ? r.f3.toFixed(1) : '',
      r.meanIntensity !== null ? r.meanIntensity.toFixed(1) : '',
      r.cog !== null ? r.cog.toFixed(1) : '',
    ].join(',')
  );

  return [headers.join(','), ...lines].join('\n');
}

/**
 * Trigger client-side file download from string content with optional UTF-8 BOM.
 */
export function downloadBlobFile(
  content: string,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;',
  withBom: boolean = true
): void {
  const fileContent = withBom ? '\uFEFF' + content : content;
  const blob = new Blob([fileContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
