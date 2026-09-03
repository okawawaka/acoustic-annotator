import os
from pathlib import Path
from typing import List, Union
from app.models.textgrid import TextGridData, Tier, IntervalEntry, PointEntry
import praatio
from praatio import textgrid as pt_tg
from praatio.utilities.constants import Interval, Point

class TextGridService:
    @staticmethod
    def parse_textgrid_file(file_path: Union[str, Path]) -> TextGridData:
        """Parse a .TextGrid file using praatio."""
        tg = pt_tg.openTextgrid(str(file_path), includeEmptyIntervals=True)
        return TextGridService._praatio_to_model(tg)

    @staticmethod
    def parse_textgrid_content(content: str) -> TextGridData:
        """Parse TextGrid text content directly."""
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".TextGrid", encoding="utf-8", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            return TextGridService.parse_textgrid_file(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    @staticmethod
    def _praatio_to_model(tg: pt_tg.Textgrid) -> TextGridData:
        tiers: List[Tier] = []
        for tier_name in tg.tierNames:
            pt_tier = tg.getTier(tier_name)
            if isinstance(pt_tier, pt_tg.IntervalTier):
                entries = [
                    IntervalEntry(start=round(entry.start, 5), end=round(entry.end, 5), label=entry.label)
                    for entry in pt_tier.entries
                ]
                tiers.append(Tier(
                    name=tier_name,
                    tier_type="interval",
                    min_timestamp=round(pt_tier.minTimestamp, 5),
                    max_timestamp=round(pt_tier.maxTimestamp, 5),
                    entries=entries
                ))
            elif isinstance(pt_tier, pt_tg.PointTier):
                entries = [
                    PointEntry(time=round(entry.time, 5), label=entry.label)
                    for entry in pt_tier.entries
                ]
                tiers.append(Tier(
                    name=tier_name,
                    tier_type="point",
                    min_timestamp=round(pt_tier.minTimestamp, 5),
                    max_timestamp=round(pt_tier.maxTimestamp, 5),
                    entries=entries
                ))
        return TextGridData(
            min_timestamp=round(tg.minTimestamp, 5),
            max_timestamp=round(tg.maxTimestamp, 5),
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