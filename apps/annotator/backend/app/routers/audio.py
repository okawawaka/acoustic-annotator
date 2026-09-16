from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.config import UPLOAD_DIR
from app.models.textgrid import AudioMetadata
from app.services.audio_service import AudioService

router = APIRouter(prefix="/api/audio", tags=["audio"])

@router.post("/upload", response_model=AudioMetadata)
async def upload_audio(file: UploadFile = File(...)):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty audio file.")
    
    audio_id, file_path = AudioService.save_uploaded_audio(file.filename or "audio.wav", contents)
    metadata = AudioService.get_audio_metadata(audio_id)
    return metadata

@router.get("/{audio_id}/stream")
def stream_audio(audio_id: str):
    matches = list(UPLOAD_DIR.glob(f"{audio_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Audio not found.")
    file_path = matches[0]
    return FileResponse(file_path, media_type="audio/wav")