import asyncio
import logging
import os
import tempfile

from fastapi import APIRouter, Form, HTTPException, UploadFile
from pydantic import BaseModel

from services.media_processor import extract_audio
from services.transcriber import transcribe_audio
from services.rag_engine import ingest_transcript
from services.script_generator import generate_script

logger = logging.getLogger(__name__)

router = APIRouter()


class ScriptRequest(BaseModel):
    topic: str
    creator_username: str
    length_hint: str | None = None
    temperature: float = 0.7


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/")
def root() -> dict[str, str]:
    return {"service": "ScriptStream API"}


@router.post("/upload-video")
async def upload_video(
    file: UploadFile,
    creator_username: str = Form(...),
) -> dict[str, str]:
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_video = os.path.join(tmpdir, "video.mp4")
        temp_audio = os.path.join(tmpdir, "audio.mp3")

        contents = await file.read()
        with open(temp_video, "wb") as f:
            f.write(contents)

        success = await asyncio.to_thread(extract_audio, temp_video, temp_audio)
        if not success:
            raise HTTPException(status_code=500, detail="Audio extraction failed")

        try:
            transcript = await asyncio.to_thread(transcribe_audio, temp_audio)
        except Exception as e:
            logger.exception("Transcription failed")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

        try:
            await asyncio.to_thread(ingest_transcript, transcript, creator_username)
        except Exception as e:
            logger.exception("RAG ingestion failed")
            raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

        return {"message": "Video processed and transcript ingested successfully"}


@router.post("/generate-script")
async def generate_script_endpoint(body: ScriptRequest) -> dict[str, str]:
    try:
        script = await asyncio.to_thread(
            generate_script,
            body.topic,
            body.creator_username,
            length_hint=body.length_hint,
            temperature=body.temperature,
        )
    except Exception as e:
        logger.exception("Script generation failed")
        raise HTTPException(status_code=500, detail=f"Script generation failed: {e}")

    return {"script": script}

