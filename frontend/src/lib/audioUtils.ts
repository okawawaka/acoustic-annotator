export async function extractPeaksFromAudioFile(
  file: File,
  numPeaks: number = 1200
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