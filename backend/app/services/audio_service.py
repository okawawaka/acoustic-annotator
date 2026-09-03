import os
import uuid
from pathlib import Path
from typing import Tuple, List
import soundfile as sf
import numpy as np
from app.config import UPLOAD_DIR
from app.models.textgrid import AudioMetadata

class AudioService:
    @staticmethod
    def save_uploaded_audio(filename: str, file_bytes: bytes) -> Tuple[str, Path]:
        audio_id = str(uuid.uuid4())
        ext = Path(filename).suffix.lower() or ".wav"
        save_path = UPLOAD_DIR / f"{audio_id}{ext}"
        with open(save_path, "wb") as f:
            f.write(file_bytes)
        return audio_id, save_path

    @staticmethod
    def get_audio_metadata(audio_id: str, num_peaks: int = 1200) -> AudioMetadata:
        matches = list(UPLOAD_DIR.glob(f"{audio_id}.*"))
        if not matches:
            raise FileNotFoundError(f"Audio file with ID {audio_id} not found.")
        file_path = matches[0]

        with sf.SoundFile(str(file_path)) as f:
            duration = len(f) / f.samplerate
            sample_rate = f.samplerate
            channels = f.channels
            
            # Read and compute downsampled peaks for UI performance
            # Read block-wise or entire file if within reasonable size
            frames = f.read(dtype='float32')
            if channels > 1:
                # Average channels for waveform
                frames = np.mean(frames, axis=1)

            # Compute peaks
            total_frames = len(frames)
            if total_frames == 0:
                peaks = []
            elif total_frames <= num_peaks:
                peaks = [round(float(abs(v)), 4) for v in frames]
            else:
                chunk_size = total_frames // num_peaks
                peaks = []
                for i in range(num_peaks):
                    start = i * chunk_size
                    end = (i + 1) * chunk_size if i < num_peaks - 1 else total_frames
                    chunk = frames[start:end]
                    peak = float(np.max(np.abs(chunk))) if len(chunk) > 0 else 0.0
                    peaks.append(round(peak, 4))

        return AudioMetadata(
            audio_id=audio_id,
            filename=file_path.name,
            duration=round(duration, 4),
            sample_rate=sample_rate,
            channels=channels,
            peaks=peaks
        )
