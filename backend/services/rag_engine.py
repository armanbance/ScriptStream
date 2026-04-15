"""RAG pipeline: chunk transcripts, embed with OpenAI, and store in Pinecone."""

import logging
import os
import re
import uuid
from typing import Any

from openai import OpenAI
from pinecone import Pinecone

from services.voice_profile import build_voice_profile, store_voice_profile

logger = logging.getLogger(__name__)

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("scriptstream")

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

TARGET_WORDS = 150
OVERLAP_SENTENCES = 2


def _word_count(text: str) -> int:
    return len(text.split())


def chunk_text(
    text: str, segments: list[dict[str, Any]] | None = None
) -> list[str]:
    """Split text into ~150-word chunks with sentence-level overlap.

    Prefers Whisper segments when available, falling back to regex
    sentence-boundary splitting on the raw text. Each chunk overlaps
    the previous by OVERLAP_SENTENCES sentences for continuity.
    """
    pieces: list[str] = []

    if segments:
        pieces = [
            seg.text.strip() if hasattr(seg, "text") else seg["text"].strip()
            for seg in segments
            if (seg.text if hasattr(seg, "text") else seg.get("text", "")).strip()
        ]

    if not pieces:
        pieces = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    if not pieces:
        return [text] if text.strip() else []

    chunks: list[str] = []
    current_pieces: list[str] = []
    current_word_count = 0

    for piece in pieces:
        wc = _word_count(piece)
        current_pieces.append(piece)
        current_word_count += wc

        if current_word_count >= TARGET_WORDS:
            chunks.append(" ".join(current_pieces))
            overlap = current_pieces[-OVERLAP_SENTENCES:]
            current_pieces = list(overlap)
            current_word_count = sum(_word_count(p) for p in current_pieces)

    if current_pieces:
        trailing = " ".join(current_pieces)
        if not chunks or trailing != chunks[-1]:
            chunks.append(trailing)

    return chunks


def _batch_embed(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in a single API call."""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return [item.embedding for item in response.data]


def ingest_transcript(
    transcript_data: dict[str, Any], creator_username: str
) -> None:
    """Embed transcript chunks and upsert them into Pinecone."""
    text = transcript_data.get("text", "")
    segments = transcript_data.get("segments")

    chunks = chunk_text(text, segments)

    if not chunks:
        return

    BATCH_SIZE = 100
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        vectors = _batch_embed(batch)

        records = [
            {
                "id": str(uuid.uuid4()),
                "values": vec,
                "metadata": {
                    "text": chunk,
                    "creator": creator_username,
                    "type": "transcript_chunk",
                },
            }
            for chunk, vec in zip(batch, vectors)
        ]
        index.upsert(vectors=records)

    logger.info("Rebuilding voice profile for %s", creator_username)
    profile = build_voice_profile(creator_username)
    store_voice_profile(creator_username, profile)
