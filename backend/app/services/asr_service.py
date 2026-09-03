import os
from typing import Dict, Any, List, Optional
from pathlib import Path
from faster_whisper import WhisperModel
from app.config import MODELS_DIR, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE
from app.models.textgrid import TextGridData, Tier, IntervalEntry

class ASRService:
    _models: Dict[str, WhisperModel] = {}

    @classmethod
    def get_model(cls, model_size: str = "base") -> WhisperModel:
        if model_size not in cls._models:
            # Optimal for standard CPU: int8 quantization with multi-threading
            cpu_threads = max(1, os.cpu_count() - 1 if os.cpu_count() else 2)
            cls._models[model_size] = WhisperModel(
                model_size_or_path=model_size,
                device=WHISPER_DEVICE,
                compute_type=WHISPER_COMPUTE_TYPE,
                download_root=str(MODELS_DIR),
                cpu_threads=cpu_threads,
                num_workers=1
            )
        return cls._models[model_size]

    @classmethod
    def transcribe(
        cls,
        audio_path: Path,
        model_size: str = "base",
        language: Optional[str] = None,
        duration: Optional[float] = None
    ) -> Dict[str, Any]:
        model = cls.get_model(model_size)

        segments, info = model.transcribe(
            str(audio_path),
            language=language,
            word_timestamps=True,
            vad_filter=True, # Voice Activity Detection filters out silence
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        detected_lang = info.language
        lang_prob = info.language_probability

        utterance_entries: List[IntervalEntry] = []
        word_entries: List[IntervalEntry] = []

        for seg in segments:
            text = seg.text.strip()
            if text:
                utterance_entries.append(IntervalEntry(
                    start=round(seg.start, 4),
                    end=round(seg.end, 4),
                    label=text
                ))
            if seg.words:
                for w in seg.words:
                    word_text = w.word.strip()
                    if word_text:
                        word_entries.append(IntervalEntry(
                            start=round(w.start, 4),
                            end=round(w.end, 4),
                            label=word_text
                        ))

        max_ts = duration if duration is not None else (
            max([e.end for e in utterance_entries + word_entries], default=1.0)
        )

        tiers = []
        # Utterance / Sentence Tier
        if utterance_entries:
            tiers.append(Tier(
                name="Utterance",
                tier_type="interval",
                min_timestamp=0.0,
                max_timestamp=max_ts,
                entries=utterance_entries
            ))
        # Word-level Tier
        if word_entries:
            tiers.append(Tier(
                name="Word",
                tier_type="interval",
                min_timestamp=0.0,
                max_timestamp=max_ts,
                entries=word_entries
            ))

        tg_data = TextGridData(
            min_timestamp=0.0,
            max_timestamp=max_ts,
            tiers=tiers
        )

        return {
            "language": detected_lang,
            "language_probability": round(lang_prob, 4),
            "textgrid": tg_data
        }
