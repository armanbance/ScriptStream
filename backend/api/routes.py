import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from services.media_processor import extract_audio
from services.youtube_trending import fetch_trending, TrendingFetchError
from services.transcriber import transcribe_audio
from services.rag_engine import ingest_transcript
from services.script_generator import generate_script
from services.youtube_ingest import (
    CaptionsUnavailable,
    fetch_captions,
    fetch_video_title,
    parse_video_id,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class ScriptRequest(BaseModel):
    topic: str
    creator_username: str
    length_hint: str | None = None
    temperature: float = 0.7

class IngestYoutubeRequest(BaseModel):
    url: str
    creator_username: str


# health check, just returns ok
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

        # extract the audio track before we try to transcribe
        success = await asyncio.to_thread(extract_audio, temp_video, temp_audio)
        if not success:
            raise HTTPException(status_code=500, detail="Audio extraction failed")

        try:
            transcript = await asyncio.to_thread(transcribe_audio, temp_audio)
        except Exception as e:
            logger.exception("Transcription failed")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

        # finally store it in the vector db
        try:
            await asyncio.to_thread(ingest_transcript, transcript, creator_username)
        except Exception as e:
            logger.exception("RAG ingestion failed")
            raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

        return {"message": "Video processed and transcript ingested successfully"}


@router.post("/ingest-youtube")
async def ingest_youtube(body: IngestYoutubeRequest) -> dict[str, str]:
    # parses the url and gets the video id first
    try:
        video_id = parse_video_id(body.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # if captions aren't available we return a 422
    try:
        transcript = await asyncio.to_thread(fetch_captions, video_id)
    except CaptionsUnavailable as e:
        raise HTTPException(
            status_code=422,
            detail=f"This video has no available captions: {e}",
        )
    except Exception as e:
        logger.exception("Caption fetch failed")
        raise HTTPException(status_code=500, detail=f"Caption fetch failed: {e}")

    # grabs the title separately, best effort
    title = await asyncio.to_thread(fetch_video_title, video_id)

    try:
        await asyncio.to_thread(ingest_transcript, transcript, body.creator_username)
    except Exception as e:
        logger.exception("RAG ingestion failed")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    return {
        "message": "YouTube transcript ingested successfully",
        "video_title": title,
        "video_id": video_id,
    }


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


# path to the cached json file
TRENDING_JSON_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "trending.json"
)


@router.get("/trending")
def get_trending(
    category_id: int | None = Query(None, alias="category_id"),
) -> dict[str, list[dict]]:
    # when category_id is given, fetch live from youtube instead of reading the file
    if category_id is not None:
        try:
            videos = fetch_trending(max_results=5, category_id=category_id)
        except TrendingFetchError as e:
            raise HTTPException(status_code=502, detail=str(e))
        return {"videos": videos}

    # fall back to the json file if no category specified
    if not TRENDING_JSON_PATH.exists():
        return {"videos": []}
    try:
        data = json.loads(TRENDING_JSON_PATH.read_text())
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Corrupt trending data: {e}")
    return {"videos": data.get("videos", [])}
