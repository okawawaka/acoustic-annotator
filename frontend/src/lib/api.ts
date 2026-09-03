import { AudioMetadata, TextGridData, Tier } from "@/types";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export async function uploadAudio(file: File): Promise<AudioMetadata> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${getApiBaseUrl()}/api/audio/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }
  return res.json();
}

export async function parseTextGrid(file: File): Promise<TextGridData> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${getApiBaseUrl()}/api/textgrid/parse`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Parse TextGrid failed: ${res.statusText}`);
  }
  return res.json();
}

export async function exportTextGrid(data: TextGridData, filename = "annotation.TextGrid") {
  const res = await fetch(`${getApiBaseUrl()}/api/textgrid/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Export TextGrid failed: ${res.statusText}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function transcribeAudio(params: {
  audioId: string;
  modelSize: string;
  language?: string;
  tierName?: string;
}): Promise<{ language: string; language_probability: number; textgrid: TextGridData }> {
  const res = await fetch(`${getApiBaseUrl()}/api/asr/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_id: params.audioId,
      model_size: params.modelSize,
      language: params.language || null,
      tier_name: params.tierName || "Whisper-ASR",
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Transcription failed: ${res.statusText}`);
  }
  return res.json();
}

export async function alignCustomText(params: {
  text: string;
  duration: number;
  tierName: string;
  splitBy: string;
}): Promise<Tier> {
  const res = await fetch(`${getApiBaseUrl()}/api/textgrid/align_text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: params.text,
      duration: params.duration,
      tier_name: params.tierName,
      split_by: params.splitBy,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Text alignment failed: ${res.statusText}`);
  }
  return res.json();
}