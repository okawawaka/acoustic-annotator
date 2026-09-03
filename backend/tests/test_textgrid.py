import pytest
from app.models.textgrid import TextGridData, Tier, IntervalEntry, PointEntry
from app.services.textgrid_service import TextGridService

def test_textgrid_roundtrip():
    # Construct a sample TextGrid
    original_data = TextGridData(
        min_timestamp=0.0,
        max_timestamp=2.5,
        tiers=[
            Tier(
                name="words",
                tier_type="interval",
                min_timestamp=0.0,
                max_timestamp=2.5,
                entries=[
                    IntervalEntry(start=0.2, end=1.0, label="hello"),
                    IntervalEntry(start=1.2, end=2.0, label="world")
                ]
            ),
            Tier(
                name="events",
                tier_type="point",
                min_timestamp=0.0,
                max_timestamp=2.5,
                entries=[
                    PointEntry(time=0.5, label="peak1"),
                    PointEntry(time=1.6, label="peak2")
                ]
            )
        ]
    )

    # Export to Praat TextGrid string
    tg_str = TextGridService.export_textgrid_string(original_data)
    assert "words" in tg_str
    assert "hello" in tg_str
    assert "world" in tg_str

    # Parse back
    parsed_data = TextGridService.parse_textgrid_content(tg_str)
    assert len(parsed_data.tiers) == 2
    
    word_tier = next(t for t in parsed_data.tiers if t.name == "words")
    assert word_tier.tier_type == "interval"
    labels = [e.label for e in word_tier.entries if e.label != ""]
    assert labels == ["hello", "world"]

    event_tier = next(t for t in parsed_data.tiers if t.name == "events")
    assert event_tier.tier_type == "point"
    assert len(event_tier.entries) == 2
    assert event_tier.entries[0].label == "peak1"
