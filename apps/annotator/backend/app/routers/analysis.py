from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pathlib import Path
from app.config import UPLOAD_DIR
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

class IntervalMetricRequest(BaseModel):
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")

@router.post("/{audio_id}/full")
def analyze_full_audio(
    audio_id: str,
    max_freq: float = Query(5000.0, description="Max frequency in Hz (default 5000)"),
    time_step: float = Query(0.01, description="Time step in seconds (default 0.01)")
):
    matches = list(UPLOAD_DIR.glob(f"{audio_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Audio file not found.")
    audio_path = matches[0]

    try:
        data = AnalysisService.analyze_audio(audio_path, max_freq=max_freq, time_step=time_step)
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
        metrics = AnalysisService.extract_interval_metrics(audio_path, req.start, req.end)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interval analysis failed: {str(e)}")