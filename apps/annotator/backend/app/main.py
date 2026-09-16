from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.audio import router as audio_router
from app.routers.textgrid import router as textgrid_router
from app.routers.asr import router as asr_router
from app.routers.analysis import router as analysis_router

app = FastAPI(
    title="Acoustic Annotator API",
    version="0.3.0",
    description="Praat-compatible acoustic analysis and TextGrid annotation engine."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio_router)
app.include_router(textgrid_router)
app.include_router(asr_router)
app.include_router(analysis_router)

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "acoustic-annotator-backend",
        "modules": ["audio", "textgrid", "asr", "analysis"]
    }