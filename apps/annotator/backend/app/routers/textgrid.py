from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Union
from app.config import UPLOAD_DIR
from app.models.textgrid import TextGridData, Tier
from app.services.textgrid_service import TextGridService
from app.services.asr_service import ASRService

class CustomTextRequest(BaseModel):
    text: str = Field(..., description="User transcript text")
    duration: float = Field(..., description="Audio duration in seconds")
    tier_name: str = Field(default="Script", description="Target tier name")
    split_by: str = Field(default="line", description="Split by 'char', 'word', or 'line'")
    audio_id: Union[str, None] = Field(default=None, description="Optional audio ID for acoustic forced alignment")

router = APIRouter(prefix="/api/textgrid", tags=["textgrid"])

@router.post("/parse", response_model=TextGridData)
async def parse_textgrid(file: UploadFile = File(...)):
    content_bytes = await file.read()
    content_str = TextGridService.decode_bytes(content_bytes)
    tg_data = TextGridService.parse_textgrid_content(content_str)
    return tg_data

@router.post("/export")
def export_textgrid(data: TextGridData, format: str = "short_textgrid"):
    content = TextGridService.export_textgrid_string(data, output_format=format)
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=annotation.TextGrid"}
    )

@router.post("/align_text", response_model=Tier)
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