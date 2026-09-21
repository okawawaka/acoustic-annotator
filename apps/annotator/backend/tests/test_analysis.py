import io
import wave
import struct
import math
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_synthetic_wav(duration=1.0, sample_rate=16000, freq=440.0) -> bytes:
    """440Hzのテスト用正弦波WAVバイナリを生成"""
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        num_samples = int(duration * sample_rate)
        frames = bytearray()
        for i in range(num_samples):
            t = float(i) / sample_rate
            value = int(16000.0 * math.sin(2.0 * math.pi * freq * t))
            frames.extend(struct.pack('<h', value))
        wav.writeframes(frames)
    buf.seek(0)
    return buf.read()

def test_audio_upload_and_analysis():
    wav_bytes = create_synthetic_wav(duration=1.0, sample_rate=16000, freq=220.0)
    
    # 1. 音声アップロード
    upload_res = client.post(
        "/api/audio/upload",
        files={"file": ("test_sine.wav", io.BytesIO(wav_bytes), "audio/wav")}
    )
    assert upload_res.status_code == 200
    meta = upload_res.json()
    assert "audio_id" in meta
    audio_id = meta["audio_id"]
    assert meta["duration"] > 0.9

    # 2. 全体音響解析 (Parselmouth F0, Formants, Spectrogram)
    analysis_res = client.post(f"/api/analysis/{audio_id}/full")
    assert analysis_res.status_code == 200
    analysis_data = analysis_res.json()
    assert "pitch" in analysis_data
    assert "formants" in analysis_data
    assert "spectrogram" in analysis_data
    assert len(analysis_data["pitch"]["times"]) > 0

    # 3. 区間音響指標解析
    interval_res = client.post(
        f"/api/analysis/{audio_id}/interval",
        json={"start": 0.2, "end": 0.8, "max_formant_freq": 5500.0}
    )
    assert interval_res.status_code == 200
    interval_data = interval_res.json()
    assert interval_data["mean_f0"] is not None
    # 220Hz 正弦波なので mean_f0 は 200〜240Hz 近傍にあるはず
    assert 180.0 <= interval_data["mean_f0"] <= 260.0
    assert interval_data["mean_intensity"] is not None
