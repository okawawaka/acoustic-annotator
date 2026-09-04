from typing import List, Literal, Union
from pydantic import BaseModel, Field

class IntervalEntry(BaseModel):
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    label: str = Field(default="", description="Annotation text label")

class PointEntry(BaseModel):
    time: float = Field(..., description="Time of point in seconds")
    label: str = Field(default="", description="Annotation text label")

class Tier(BaseModel):
    name: str = Field(..., description="Name of the tier")
    tier_type: Literal["interval", "point"] = Field(..., description="Tier type: interval or point")
    min_timestamp: float = Field(default=0.0, description="Minimum timestamp")
    max_timestamp: float = Field(default=0.0, description="Maximum timestamp")
    entries: List[Union[IntervalEntry, PointEntry]] = Field(default_factory=list, description="List of entries")

class TextGridData(BaseModel):
    min_timestamp: float = Field(default=0.0, description="Total start time in seconds")
    max_timestamp: float = Field(..., description="Total end time in seconds")
    tiers: List[Tier] = Field(default_factory=list, description="List of tiers")

class ASRRequest(BaseModel):
    audio_id: str
    model_size: str = Field(default="base", description="Whisper model size: tiny, base, small, medium")
    language: Union[str, None] = Field(default=None, description="Language code (e.g. ja, en). None for auto-detect")
    tier_name: str = Field(default="Whisper", description="Target tier name prefix")
    output_tier: Literal["word", "utterance", "both"] = Field(default="both", description="Tiers to output: 'word', 'utterance', or 'both'")

class AudioMetadata(BaseModel):
    audio_id: str
    filename: str
    duration: float
    sample_rate: int
    channels: int
    peaks: List[float] = Field(default_factory=list, description="Downsampled peaks for waveform rendering")