from typing import List
from pydantic import BaseModel, Field

class AudioMetadata(BaseModel):
    audio_id: str
    filename: str
    duration: float
    sample_rate: int
    channels: int
    peaks: List[float] = Field(default_factory=list, description="Downsampled peaks for waveform rendering")