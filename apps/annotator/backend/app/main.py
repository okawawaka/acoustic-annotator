import io
from typing import Union, Optional
from pathlib import Path
from pydantic import BaseModel, Field
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from app.config import UPLOAD_DIR
from app.models.textgrid import TextGridData, AudioMetadata, ASRRequest, Tier
from app.services.textgrid_service import TextGridService
from app.services.audio_service import AudioService
from app.services.asr_service import ASRService

class CustomTextRequest(BaseModel):
    text: str = Field(..., description="User transcript text")
    duration: float = Field(..., description="Audio duration in seconds")
    tier_name: str = Field(default="Script", description="Target tier name")
    split_by: str = Field(default="line", description="Split by 'char', 'word', or 'line'")
    audio_id: Union[str, None] = Field(default=None, description="Optional audio ID for acoustic forced alignment")

app = FastAPI(
    title="Acoustic Annotator API",
    version="0.1.0",
    description="High-performance, CPU-optimized backend for acoustic analysis and Praat TextGrid annotation."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "acoustic-annotator"}

@app.post("/api/audio/upload", response_model=AudioMetadata)
async def upload_audio(file: UploadFile = File(...)):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty audio file.")
    
    audio_id, file_path = AudioService.save_uploaded_audio(file.filename or "audio.wav", contents)
    metadata = AudioService.get_audio_metadata(audio_id)
    return metadata

@app.get("/api/audio/{audio_id}/stream")
def stream_audio(audio_id: str):
    matches = list(UPLOAD_DIR.glob(f"{audio_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Audio not found.")
    file_path = matches[0]
    return FileResponse(file_path, media_type="audio/wav")

@app.post("/api/textgrid/parse", response_model=TextGridData)
async def parse_textgrid(file: UploadFile = File(...)):
    content_bytes = await file.read()
    content_str = TextGridService.decode_bytes(content_bytes)
    tg_data = TextGridService.parse_textgrid_content(content_str)
    return tg_data

@app.post("/api/textgrid/export")
def export_textgrid(data: TextGridData, format: str = "short_textgrid"):
    content = TextGridService.export_textgrid_string(data, output_format=format)
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=annotation.TextGrid"}
    )

@app.post("/api/asr/transcribe")
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

@app.post("/api/textgrid/align_text", response_model=Tier)
def align_custom_text(req: CustomTextRequest):
    audio_path = None
    if req.audio_id:
        matches = list(UPLOAD_DIR.glob(f"{req.audio_id}.*"))
        if matches:
            audio_path = matches[0]

    tier = ASRService.align_custom_text(
        text=req.text,
        duration=req.duration,
        tier_name=req.tier_name,
        split_by=req.split_by,
        audio_path=audio_path
    )
    return tier