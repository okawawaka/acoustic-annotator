import numpy as np
import parselmouth
from parselmouth.praat import call
from typing import Dict, List, Any, Optional
from pathlib import Path

class AnalysisService:
    @staticmethod
    def analyze_audio(
        audio_path: Path,
        max_freq: float = 5000.0,
        max_formant_freq: float = 5500.0,
        time_step: float = 0.01
    ) -> Dict[str, Any]:
        sound = parselmouth.Sound(str(audio_path))
        duration = sound.duration

        # 1. Praat Pitch (F0)
        pitch = sound.to_pitch_ac(time_step=time_step, pitch_floor=75.0, pitch_ceiling=600.0)
        pitch_times = []
        pitch_values = []
        for t in np.arange(0, duration, time_step):
            val = pitch.get_value_at_time(t)
            pitch_times.append(round(float(t), 3))
            pitch_values.append(round(float(val), 2) if (val is not None and not np.isnan(val)) else None)

        # 2. Praat Formants (Burg法) - 声道長・話者上限周波数 (女性: 5500Hz, 男性: 5000Hz)
        formant = sound.to_formant_burg(
            time_step=time_step,
            max_number_of_formants=5,
            maximum_formant=max_formant_freq,
            window_length=0.025,
            pre_emphasis_from=50.0
        )
        formant_times = []
        f1_values = []
        f2_values = []
        f3_values = []
        for t in np.arange(0, duration, time_step):
            f1 = formant.get_value_at_time(1, t)
            f2 = formant.get_value_at_time(2, t)
            f3 = formant.get_value_at_time(3, t)
            formant_times.append(round(float(t), 3))
            f1_values.append(round(float(f1), 1) if (f1 is not None and not np.isnan(f1)) else None)
            f2_values.append(round(float(f2), 1) if (f2 is not None and not np.isnan(f2)) else None)
            f3_values.append(round(float(f3), 1) if (f3 is not None and not np.isnan(f3)) else None)

        # 3. Praat Spectrogram (STFT)
        spectrogram = sound.to_spectrogram(
            window_length=0.005,
            maximum_frequency=max_freq,
            time_step=time_step,
            frequency_step=50.0
        )
        
        times = [round(float(x), 3) for x in spectrogram.xs()]
        freqs = [round(float(y), 1) for y in spectrogram.ys()]
        vals = spectrogram.values
        num_freqs, num_times = vals.shape
        
        matrix = []
        for j in range(num_freqs):
            row = []
            for i in range(num_times):
                v = vals[j, i]
                c = max(0.0, min(100.0, float(v))) if not np.isnan(v) else 0.0
                row.append(round(c, 1))
            matrix.append(row)

        return {
            "duration": round(duration, 3),
            "time_step": time_step,
            "max_frequency": max_freq,
            "max_formant_freq": max_formant_freq,
            "times": times,
            "frequencies": freqs,
            "spectrogram": matrix,
            "pitch": {
                "times": pitch_times,
                "values": pitch_values
            },
            "formants": {
                "times": formant_times,
                "f1": f1_values,
                "f2": f2_values,
                "f3": f3_values
            }
        }

    @staticmethod
    def extract_interval_metrics(
        audio_path: Path,
        start_time: float,
        end_time: float,
        max_formant_freq: float = 5500.0
    ) -> Dict[str, Any]:
        sound = parselmouth.Sound(str(audio_path))
        dur_total = sound.duration
        s = max(0.0, min(dur_total, start_time))
        e = max(s, min(dur_total, end_time))
        dur_ms = round((e - s) * 1000, 1)

        if dur_ms < 10.0:
            return {
                "duration_ms": dur_ms,
                "mean_f0": None,
                "min_f0": None,
                "max_f0": None,
                "f1": None,
                "f2": None,
                "f3": None,
                "mean_intensity": None
            }

        part = sound.extract_part(from_time=s, to_time=e, preserve_times=False)

        pitch = part.to_pitch_ac(pitch_floor=75.0, pitch_ceiling=600.0)
        mean_f0 = call(pitch, "Get mean", 0, 0, "Hertz")
        min_f0 = call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic")
        max_f0 = call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic")

        # LPC Burg 法 - 指定された上限周波数でフォルマント推定
        formant = part.to_formant_burg(
            max_number_of_formants=5,
            maximum_formant=max_formant_freq,
            window_length=0.025
        )
        part_dur = part.duration
        f_start = part_dur * 0.2
        f_end = part_dur * 0.8
        f1 = call(formant, "Get mean", 1, f_start, f_end, "Hertz")
        f2 = call(formant, "Get mean", 2, f_start, f_end, "Hertz")
        f3 = call(formant, "Get mean", 3, f_start, f_end, "Hertz")

        intensity = part.to_intensity()
        mean_int = call(intensity, "Get mean", 0, 0, "energy")

        def clean_val(v, digits=1):
            if v is None or np.isnan(v):
                return None
            return round(float(v), digits)

        return {
            "duration_ms": dur_ms,
            "mean_f0": clean_val(mean_f0, 1),
            "min_f0": clean_val(min_f0, 1),
            "max_f0": clean_val(max_f0, 1),
            "f1": clean_val(f1, 1),
            "f2": clean_val(f2, 1),
            "f3": clean_val(f3, 1),
            "mean_intensity": clean_val(mean_int, 1),
            "max_formant_freq": max_formant_freq
        }
