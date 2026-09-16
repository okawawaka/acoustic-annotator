from fastapi import APIRouter, HTTPException
from app.config import UPLOAD_DIR
from app.models.textgrid import ASRRequest
from app.services.audio_service import AudioService
from app.services.asr_service import ASRService

router = APIRouter(prefix="/api/asr", tags=["asr"])

@router.post("/transcribe")
def transcribe_audio(req: ASRRequest):
    matches = list(UPLOAD_DIR.glob(f"{req.audio_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Audio file not found.")
    audio_path = matches[0]

    metadata = AudioService.get_audio_metadata(req.audio_id)
    result = ASRService.transcribe(
        audio_path=audio_path,
        model_size=req.model_size,
        language=req.language,
        duration=metadata.duration,
        output_tier=req.output_tier
    )
    return result