import os
from typing import Any

from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def transcribe_audio(audio_path: str) -> dict[str, Any]:
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
