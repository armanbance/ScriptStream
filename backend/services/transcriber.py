"""Speech-to-text transcription using OpenAI Whisper."""

import os
from typing import Any

from openai import OpenAI


client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def transcribe_audio(audio_path: str) -> dict[str, Any]:
    """Convert an audio file to text using Whisper, returning segment data.

    Returns a dict with "text" (full transcript) and "segments" (list of
    Whisper segment dicts, each containing chunked audio text).
    """
    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
        )
    return {
        "text": transcription.text,
        "segments": transcription.segments,
    }
