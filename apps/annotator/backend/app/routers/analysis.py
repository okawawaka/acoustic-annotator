from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pathlib import Path
from app.config import UPLOAD_DIR
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

class IntervalMetricRequest(BaseModel):
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    max_formant_freq: float = Field(default=5500.0, description="Max formant frequency (Female: 5500Hz, Male: 5000Hz)")

@router.post("/{audio_id}/full")
def analyze_full_audio(
    audio_id: str,
    max_freq: float = Query(5000.0, description="Max frequency for spectrogram in Hz (default 5000)"),
    max_formant_freq: float = Query(5500.0, description="Max formant frequency for Burg LPC (default 5500 for female, 5000 for male)"),
    time_step: float = Query(0.01, description="Time step in seconds (default 0.01)")
):
    matches = list(UPLOAD_DIR.glob(f"{audio_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Audio file not found.")
    audio_path = matches[0]

    try:
        data = AnalysisService.analyze_audio(
            audio_path,
            max_freq=max_freq,
            max_formant_freq=max_formant_freq,
            time_step=time_step
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Acoustic analysis failed: {str(e)}")

@router.post("/{audio_id}/interval")
def analyze_interval(audio_id: str, req: IntervalMetricRequest):
    matches = list(UPLOAD_DIR.glob(f"{audio_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Audio file not found.")
    audio_path = matches[0]

    try:
        metrics = AnalysisService.extract_interval_metrics(
            audio_path,
            req.start,
            req.end,
            max_formant_freq=req.max_formant_freq
        )
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interval analysis failed: {str(e)}")
