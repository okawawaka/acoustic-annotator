import io
import wave
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_synthetic_wav_bytes(duration_sec: float = 1.0, sr: int = 16000) -> bytes:
    t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False, dtype=np.float32)
    # 440Hz sine wave tone
    audio_data = (0.3 * np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(audio_data.tobytes())
    return buf.getvalue()

def test_asr_transcribe_end_to_end():
    wav_bytes = create_synthetic_wav_bytes(1.0)
    files = {"file": ("test_asr.wav", wav_bytes, "audio/wav")}
    upload_res = client.post("/api/audio/upload", files=files)
    assert upload_res.status_code == 200
    meta = upload_res.json()
    assert "audio_id" in meta
    audio_id = meta["audio_id"]

    # Transcribe request
    asr_payload = {
        "audio_id": audio_id,
        "model_size": "base",
        "language": "ja",
        "tier_name": "Words",
        "output_tier": "word"
    }
    transcribe_res = client.post("/api/asr/transcribe", json=asr_payload)
    assert transcribe_res.status_code == 200
    result = transcribe_res.json()
    assert "textgrid" in result
    assert "tiers" in result["textgrid"]
    assert "language" in result

def test_asr_audio_not_found():
    asr_payload = {
        "audio_id": "non_existent_audio_id_12345",
        "model_size": "base",
        "language": "ja",
        "output_tier": "word"
    }
    transcribe_res = client.post("/api/asr/transcribe", json=asr_payload)
    assert transcribe_res.status_code == 404
    assert "Audio file not found" in transcribe_res.json()["detail"]
