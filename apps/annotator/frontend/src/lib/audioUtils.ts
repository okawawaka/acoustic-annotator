export async function extractPeaksFromAudioFile(
  file: File,
  numPeaks: number = 4000
): Promise<{ duration: number; peaks: number[]; sampleRate: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0); // Mono or first channel
    const totalSamples = channelData.length;
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;

    const peaks: number[] = [];
    if (totalSamples <= numPeaks) {
      for (let i = 0; i < totalSamples; i++) {
        peaks.push(Math.abs(channelData[i]));
      }
    } else {
      const step = Math.floor(totalSamples / numPeaks);
      for (let i = 0; i < numPeaks; i++) {
        let max = 0;
        const start = i * step;
        const end = Math.min(start + step, totalSamples);
        for (let j = start; j < end; j++) {
          const val = Math.abs(channelData[j]);
          if (val > max) max = val;
        }
        peaks.push(max);
      }
    }

    return { duration, peaks, sampleRate };
  } finally {
    audioCtx.close();
  }
}

/**
 * AudioBuffer を 16-bit PCM WAV フォーマットの Blob に変換
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = numSamples * (bitDepth / 8);
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}