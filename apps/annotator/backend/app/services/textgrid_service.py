import os
from pathlib import Path
from typing import List, Union
from app.models.textgrid import TextGridData, Tier, IntervalEntry, PointEntry
import praatio
from praatio import textgrid as pt_tg
from praatio.utilities.constants import Interval, Point

class TextGridService:
    @staticmethod
    def decode_bytes(content_bytes: bytes) -> str:
        """Robustly decode TextGrid raw bytes with BOM and multi-encoding detection."""
        if content_bytes.startswith(b'\xff\xfe'):
            return content_bytes.decode('utf-16-le', errors='replace')
        if content_bytes.startswith(b'\xfe\xff'):
            return content_bytes.decode('utf-16-be', errors='replace')
        if content_bytes.startswith(b'\xef\xbb\xbf'):
            return content_bytes.decode('utf-8-sig', errors='replace')

        for enc in ['utf-8', 'utf-16', 'cp932', 'shift_jis', 'latin-1']:
            try:
                return content_bytes.decode(enc)
            except (UnicodeDecodeError, LookupError):
                continue

        return content_bytes.decode('utf-8', errors='replace')

    @staticmethod
    def parse_textgrid_content(content: str) -> TextGridData:
        """Parse TextGrid text content with multiple fallback strategies."""
        # 1. Try praatio first
        import tempfile
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".TextGrid", encoding="utf-8", delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            try:
                tg = pt_tg.openTextgrid(tmp_path, includeEmptyIntervals=True)
                return TextGridService._praatio_to_model(tg)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception:
            # 2. Fallback to robust regex parser
            return TextGridService._robust_parse(content)

    @staticmethod
    def _praatio_to_model(tg: pt_tg.Textgrid) -> TextGridData:
        """Convert praatio Textgrid instance to application TextGridData model."""
        tiers: List[Tier] = []
        for name in tg.tierNames:
            tier_obj = tg.getTier(name)
            is_interval = isinstance(tier_obj, pt_tg.IntervalTier)
            entries = []
            if is_interval:
                for entry in tier_obj.entries:
                    entries.append(IntervalEntry(
                        start=round(float(entry.start), 5),
                        end=round(float(entry.end), 5),
                        label=entry.label
                    ))
                tiers.append(Tier(
                    name=name,
                    tier_type="interval",
                    min_timestamp=round(float(tier_obj.minTimestamp), 5),
                    max_timestamp=round(float(tier_obj.maxTimestamp), 5),
                    entries=entries
                ))
            else:
                for entry in tier_obj.entries:
                    entries.append(PointEntry(
                        time=round(float(entry.time), 5),
                        label=entry.label
                    ))
                tiers.append(Tier(
                    name=name,
                    tier_type="point",
                    min_timestamp=round(float(tier_obj.minTimestamp), 5),
                    max_timestamp=round(float(tier_obj.maxTimestamp), 5),
                    entries=entries
                ))

        return TextGridData(
            min_timestamp=round(float(tg.minTimestamp), 5),
            max_timestamp=round(float(tg.maxTimestamp), 5),
            tiers=tiers
        )

    @staticmethod
    def parse_textgrid_file(file_path: Union[str, Path]) -> TextGridData:
        with open(file_path, "rb") as f:
            raw_bytes = f.read()
        content = TextGridService.decode_bytes(raw_bytes)
        return TextGridService.parse_textgrid_content(content)

    @staticmethod
    def _robust_parse(text: str) -> TextGridData:
        """Custom regex-based robust parser for Praat TextGrid (handles empty lines, custom headers, short/long)."""
        import re
        clean_text = text.replace("\r\n", "\n").replace("\r", "\n").strip()

        # Check for Short TextGrid format
        lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
        if lines and len(lines) > 5 and ("ooTextFile" in lines[0]):
            if len(lines) > 1 and ("TextGrid" in lines[1]) and not any("item [" in l or "xmin =" in l for l in lines[:10]):
                try:
                    import praatio.utilities.textgrid_io as tio
                    tg_dict = tio.parseTextgridStr(clean_text, includeEmptyIntervals=True)
                    tiers: List[Tier] = []
                    for t in tg_dict.get("tiers", []):
                        is_int = t.get("type") == "IntervalTier"
                        entries = []
                        for e in t.get("entryList", []):
                            if is_int:
                                entries.append(IntervalEntry(start=round(e[0], 5), end=round(e[1], 5), label=e[2]))
                            else:
                                entries.append(PointEntry(time=round(e[0], 5), label=e[1]))
                        tiers.append(Tier(
                            name=t.get("name", "Tier"),
                            tier_type="interval" if is_int else "point",
                            min_timestamp=round(t.get("minT", 0.0), 5),
                            max_timestamp=round(t.get("maxT", 0.0), 5),
                            entries=entries
                        ))
                    return TextGridData(
                        min_timestamp=round(float(lines[2]), 5),
                        max_timestamp=round(float(lines[3]), 5),
                        tiers=tiers
                    )
                except Exception:
                    pass

        # Long TextGrid format
        min_m = re.search(r"^\s*xmin\s*=\s*([-\d.]+)", clean_text, re.MULTILINE)
        max_m = re.search(r"^\s*xmax\s*=\s*([-\d.]+)", clean_text, re.MULTILINE)
        total_min = float(min_m.group(1)) if min_m else 0.0
        total_max = float(max_m.group(1)) if max_m else 10.0

        tier_chunks = re.split(r"item\s*\[\s*\d+\s*\]\s*:", clean_text)
        if len(tier_chunks) <= 1:
            tier_chunks = re.split(r"item\s*\[", clean_text)

        tiers: List[Tier] = []
        for chunk in tier_chunks[1:]:
            class_m = re.search(r'class\s*=\s*"([^"]+)"', chunk)
            tier_class = class_m.group(1).strip() if class_m else "IntervalTier"
            is_interval = "interval" in tier_class.lower()

            name_m = re.search(r'name\s*=\s*"([^"]*)"', chunk)
            tier_name = name_m.group(1) if name_m else "Tier"

            t_min_m = re.search(r"xmin\s*=\s*([-\d.]+)", chunk)
            t_max_m = re.search(r"xmax\s*=\s*([-\d.]+)", chunk)
            t_min = float(t_min_m.group(1)) if t_min_m else total_min
            t_max = float(t_max_m.group(1)) if t_max_m else total_max

            entries = []
            if is_interval:
                int_matches = re.finditer(
                    r'xmin\s*=\s*([-\d.]+)\s*\n\s*xmax\s*=\s*([-\d.]+)\s*\n\s*text\s*=\s*"([^"]*)"',
                    chunk
                )
                for m in int_matches:
                    entries.append(IntervalEntry(
                        start=round(float(m.group(1)), 5),
                        end=round(float(m.group(2)), 5),
                        label=m.group(3)
                    ))
                tiers.append(Tier(
                    name=tier_name,
                    tier_type="interval",
                    min_timestamp=t_min,
                    max_timestamp=t_max,
                    entries=entries
                ))
            else:
                pt_matches = re.finditer(
                    r'(?:time|number)\s*=\s*([-\d.]+)\s*\n\s*(?:mark|text)\s*=\s*"([^"]*)"',
                    chunk
                )
                for m in pt_matches:
                    entries.append(PointEntry(
                        time=round(float(m.group(1)), 5),
                        label=m.group(2)
                    ))
                tiers.append(Tier(
                    name=tier_name,
                    tier_type="point",
                    min_timestamp=t_min,
                    max_timestamp=t_max,
                    entries=entries
                ))

        return TextGridData(
            min_timestamp=round(total_min, 5),
            max_timestamp=round(total_max, 5),
            tiers=tiers
        )

    @staticmethod
    def model_to_praatio(data: TextGridData) -> pt_tg.Textgrid:
        tg = pt_tg.Textgrid(minTimestamp=data.min_timestamp, maxTimestamp=data.max_timestamp)

        for tier in data.tiers:
            if tier.tier_type == "interval":
                pt_entries = []
                current_time = data.min_timestamp
                for entry in sorted(tier.entries, key=lambda x: x.start):
                    if entry.start > current_time:
                        pt_entries.append(Interval(start=current_time, end=entry.start, label=""))
                    pt_entries.append(Interval(start=entry.start, end=entry.end, label=entry.label))
                    current_time = entry.end
                if current_time < data.max_timestamp:
                    pt_entries.append(Interval(start=current_time, end=data.max_timestamp, label=""))
                
                pt_tier = pt_tg.IntervalTier(
                    name=tier.name,
                    entries=pt_entries,
                    minT=data.min_timestamp,
                    maxT=data.max_timestamp
                )
                tg.addTier(pt_tier)
            elif tier.tier_type == "point":
                pt_entries = [
                    Point(time=entry.time, label=entry.label)
                    for entry in sorted(tier.entries, key=lambda x: x.time)
                ]
                pt_tier = pt_tg.PointTier(
                    name=tier.name,
                    entries=pt_entries,
                    minT=data.min_timestamp,
                    maxT=data.max_timestamp
                )
                tg.addTier(pt_tier)
        return tg

    @staticmethod
    def export_textgrid_string(data: TextGridData, output_format: str = "short_textgrid") -> str:
        """Export TextGridData to string compatible with Praat."""
        import tempfile
        tg = TextGridService.model_to_praatio(data)
        with tempfile.NamedTemporaryFile("w", suffix=".TextGrid", encoding="utf-8", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            tg.save(
                fn=tmp_path,
                format=output_format,
                includeBlankSpaces=True
            )
            with open(tmp_path, "r", encoding="utf-8") as f:
                return f.read()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)