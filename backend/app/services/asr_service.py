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

        # Decode full audio into 16kHz float32 array in memory
        from faster_whisper.audio import decode_audio
        audio = decode_audio(str(audio_path))
        sample_rate = 16000
        total_duration = duration if duration is not None else float(len(audio) / sample_rate)

        utterance_entries: List[IntervalEntry] = []
        word_entries: List[IntervalEntry] = []

        # Progressive Transcription Loop:
        # Guarantees that the entire audio from 0.0 to total_duration is transcribed,
        # never cutting off mid-way due to pauses or premature <|endoftext|> tokens.
        cur_time = 0.0
        step_window = 30.0 # 30s Whisper native context window
        detected_lang = language or "ja"
        lang_prob = 1.0

        while cur_time < total_duration - 0.2:
            start_sample = int(cur_time * sample_rate)
            end_sample = min(len(audio), int((cur_time + step_window) * sample_rate))
            chunk = audio[start_sample:end_sample]

            if len(chunk) < int(0.2 * sample_rate):
                break

            segments_generator, info = model.transcribe(
                chunk,
                language=language,
                word_timestamps=True,
                vad_filter=False,
                condition_on_previous_text=False,
                beam_size=1,
                best_of=1,
                temperature=0.0
            )

            if detected_lang is None and info.language:
                detected_lang = info.language
                lang_prob = info.language_probability

            seg_list = list(segments_generator)

            if not seg_list:
                # No speech detected in this 30s chunk; advance by 5s to look for next speech
                cur_time += 5.0
                continue

            last_seg_end_offset = 0.0

            for seg in seg_list:
                seg_text = seg.text.strip()
                abs_start = round(cur_time + seg.start, 4)
                abs_end = round(cur_time + seg.end, 4)
                last_seg_end_offset = max(last_seg_end_offset, seg.end)

                if seg_text and abs_end > abs_start:
                    utterance_entries.append(IntervalEntry(
                        start=abs_start,
                        end=abs_end,
                        label=seg_text
                    ))

                if seg.words:
                    for w in seg.words:
                        w_text = w.word.strip()
                        w_start = round(cur_time + w.start, 4)
                        w_end = round(cur_time + w.end, 4)
                        if w_text and w_end > w_start:
                            word_entries.append(IntervalEntry(
                                start=w_start,
                                end=w_end,
                                label=w_text
                            ))

            # Next chunk starts at the end of the last recognized speech in this chunk
            if last_seg_end_offset > 0.3:
                cur_time += last_seg_end_offset
            else:
                cur_time += 5.0

        max_ts = total_duration

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

    @classmethod
    def align_custom_text(
        cls,
        text: str,
        duration: float,
        tier_name: str = "Script",
        split_by: str = "line",
        audio_path: Optional[Path] = None
    ) -> Tier:
        """Create acoustically aligned intervals from user transcript text using Whisper & SequenceMatcher."""
        import difflib
        entries: List[IntervalEntry] = []

        # 1. Prepare target items from user text
        if split_by == "char":
            user_items = [ch for ch in text if not ch.isspace()]
        elif split_by == "word":
            user_items = [w.strip() for w in re.split(r'[\s、。,\.]+', text) if w.strip()]
        else: # By line
            user_items = [line.strip() for line in text.splitlines() if line.strip()]

        if not user_items:
            user_items = [text.strip()] if text.strip() else []

        aligned = False

        # 2. Acoustic Alignment via Whisper + SequenceMatcher
        if audio_path and audio_path.exists() and user_items:
            try:
                model = cls.get_model("base")
                from faster_whisper.audio import decode_audio
                audio = decode_audio(str(audio_path))

                segments_generator, _ = model.transcribe(
                    audio,
                    language="ja",
                    initial_prompt=text[:300],
                    word_timestamps=True,
                    beam_size=1,
                    best_of=1,
                    temperature=0.0
                )
                seg_list = list(segments_generator)

                # Collect recognized words with timestamps
                rec_words = []
                for s in seg_list:
                    if s.words:
                        for w in s.words:
                            w_txt = w.word.strip()
                            if w_txt and w.end > w.start:
                                rec_words.append((round(w.start, 3), round(w.end, 3), w_txt))

                if rec_words:
                    speech_intervals: List[IntervalEntry] = []

                    if split_by == "char":
                        # Decompose recognized words into characters with linear intra-word interpolation
                        rec_char_spans = []
                        for s_time, e_time, w_txt in rec_words:
                            clean_chars = [c for c in w_txt if not c.isspace()]
                            if clean_chars:
                                step = (e_time - s_time) / len(clean_chars)
                                for idx, c in enumerate(clean_chars):
                                    c_start = round(s_time + idx * step, 3)
                                    c_end = round(s_time + (idx + 1) * step, 3)
                                    rec_char_spans.append((c_start, c_end, c))

                        # Build strings for alignment
                        user_str = "".join(user_items)
                        rec_str = "".join([span[2] for span in rec_char_spans])

                        matcher = difflib.SequenceMatcher(None, user_str, rec_str)
                        matched_spans: List[Optional[Tuple[float, float]]] = [None] * len(user_items)

                        for tag, u_start, u_end, r_start, r_end in matcher.get_opcodes():
                            if tag in ("equal", "replace"):
                                u_count = u_end - u_start
                                r_count = r_end - r_start
                                if u_count == r_count:
                                    # Exact 1-to-1 character match: use exact Whisper timestamps
                                    for k in range(u_count):
                                        matched_spans[u_start + k] = (
                                            rec_char_spans[r_start + k][0],
                                            rec_char_spans[r_start + k][1]
                                        )
                                elif r_count > 0 and u_count > 0:
                                    seg_s = rec_char_spans[r_start][0]
                                    seg_e = rec_char_spans[r_end - 1][1]
                                    char_step = (seg_e - seg_s) / u_count
                                    for k in range(u_count):
                                        c_s = round(seg_s + k * char_step, 3)
                                        c_e = round(seg_s + (k + 1) * char_step, 3)
                                        matched_spans[u_start + k] = (c_s, c_e)

                        # Interpolate any unmatched spans
                        last_e = 0.0
                        for idx, span in enumerate(matched_spans):
                            u_char = user_items[idx]
                            if span is not None:
                                speech_intervals.append(IntervalEntry(start=span[0], end=span[1], label=u_char))
                                last_e = span[1]
                            else:
                                # Fallback local estimate
                                speech_intervals.append(IntervalEntry(start=last_e, end=round(last_e + 0.2, 3), label=u_char))
                                last_e = round(last_e + 0.2, 3)

                    elif split_by == "word":
                        user_str_list = [w.lower() for w in user_items]
                        rec_str_list = [w[2].lower() for w in rec_words]

                        matcher = difflib.SequenceMatcher(None, user_str_list, rec_str_list)
                        matched_word_spans: List[Optional[Tuple[float, float]]] = [None] * len(user_items)

                        for tag, u_start, u_end, r_start, r_end in matcher.get_opcodes():
                            if tag in ("equal", "replace") and r_end > r_start and u_end > u_start:
                                seg_s = rec_words[r_start][0]
                                seg_e = rec_words[r_end - 1][1]
                                u_count = u_end - u_start
                                step = (seg_e - seg_s) / u_count
                                for k in range(u_count):
                                    matched_word_spans[u_start + k] = (
                                        round(seg_s + k * step, 3),
                                        round(seg_s + (k + 1) * step, 3)
                                    )

                        last_e = 0.0
                        for idx, span in enumerate(matched_word_spans):
                            u_word = user_items[idx]
                            if span is not None:
                                speech_intervals.append(IntervalEntry(start=span[0], end=span[1], label=u_word))
                                last_e = span[1]
                            else:
                                speech_intervals.append(IntervalEntry(start=last_e, end=round(last_e + 0.5, 3), label=u_word))
                                last_e = round(last_e + 0.5, 3)

                    else: # By line
                        total_segs = len(seg_list)
                        total_user = len(user_items)
                        for i, u_line in enumerate(user_items):
                            seg_idx = min(total_segs - 1, int(i * (total_segs / total_user)))
                            s = round(seg_list[seg_idx].start, 3)
                            e = round(seg_list[seg_idx].end, 3)
                            speech_intervals.append(IntervalEntry(start=s, end=e, label=u_line))

                    # 3. Build Praat continuous timeline with silence intervals
                    speech_intervals.sort(key=lambda x: x.start)
                    continuous_entries: List[IntervalEntry] = []
                    curr_time = 0.0

                    for item in speech_intervals:
                        if item.start > curr_time + 0.02:
                            continuous_entries.append(IntervalEntry(
                                start=round(curr_time, 3),
                                end=round(item.start, 3),
                                label=""
                            ))
                            curr_time = item.start
                        elif item.start < curr_time:
                            item.start = curr_time

                        if item.end > item.start + 0.01:
                            continuous_entries.append(IntervalEntry(
                                start=round(item.start, 3),
                                end=round(item.end, 3),
                                label=item.label
                            ))
                            curr_time = item.end

                    if curr_time < duration:
                        continuous_entries.append(IntervalEntry(
                            start=round(curr_time, 3),
                            end=round(duration, 3),
                            label=""
                        ))

                    entries = continuous_entries
                    aligned = True
            except Exception as e:
                print(f"[ASRService.align_custom_text] Acoustic alignment fallback: {e}")

        # 4. Fallback: Proportional distribution if no audio or alignment failed
        if not aligned:
            count = len(user_items)
            if count > 0:
                interval_len = duration / count
                for i, item in enumerate(user_items):
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