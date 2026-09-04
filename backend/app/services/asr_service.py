import os
import re
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
        duration: Optional[float] = None,
        output_tier: str = "both"
    ) -> Dict[str, Any]:
        model = cls.get_model(model_size)

        # Transcribe without aggressive VAD filter to ensure the ENTIRE audio is processed from start to finish
        segments_generator, info = model.transcribe(
            str(audio_path),
            language=language,
            word_timestamps=True,
            vad_filter=False, # Process entire audio duration without cutting off early
            condition_on_previous_text=False, # Avoid repetition loops and stalls
            no_speech_threshold=0.6,
            beam_size=1, # Fast and reliable on CPU
            best_of=1,
            temperature=0.0
        )

        detected_lang = info.language
        lang_prob = info.language_probability

        utterance_entries: List[IntervalEntry] = []
        word_entries: List[IntervalEntry] = []

        for seg in segments_generator:
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
        # Utterance Tier (Sentence level)
        if output_tier in ["utterance", "both"] and utterance_entries:
            tiers.append(Tier(
                name="Utterance",
                tier_type="interval",
                min_timestamp=0.0,
                max_timestamp=max_ts,
                entries=utterance_entries
            ))

        # Word Tier (Word level)
        if output_tier in ["word", "both"] and word_entries:
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
            "language_probability": round(lang_prob, 4) if lang_prob is not None else 1.0,
            "textgrid": tg_data
        }

    @staticmethod
    def align_custom_text(
        text: str,
        duration: float,
        tier_name: str = "Script",
        split_by: str = "line"
    ) -> Tier:
        """Create intervals from custom user transcript text distributed over duration."""
        if split_by == "word":
            items = [w.strip() for w in re.split(r'[\s、。]+', text) if w.strip()]
        else: # By line
            items = [line.strip() for line in text.splitlines() if line.strip()]

        if not items:
            items = [text.strip()] if text.strip() else []

        entries: List[IntervalEntry] = []
        count = len(items)
        if count > 0:
            interval_len = duration / count
            for i, item in enumerate(items):
                s = round(i * interval_len, 3)
                e = round((i + 1) * interval_len, 3)
                entries.append(IntervalEntry(start=s, end=e, label=item))

        return Tier(
            name=tier_name,
            tier_type="interval",
            min_timestamp=0.0,
            max_timestamp=duration,
            entries=entries
        )