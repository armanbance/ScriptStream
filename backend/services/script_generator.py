"""Retrieval-augmented script generation using Pinecone and OpenAI."""

import os

from openai import OpenAI
from pinecone import Pinecone

from services.voice_profile import get_voice_profile

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("scriptstream")

GENERATION_MODEL = os.environ.get("GENERATION_MODEL", "gpt-4o")
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
TOP_K_CHUNKS = 15

_BASE_INSTRUCTIONS = """\
You are ghostwriting a script that must be indistinguishable from the original \
creator's own work. Your ONLY output is the spoken words—no stage directions, \
camera cues, scene headings, or action lines.

STRICT RULES:
1. Voice fidelity is your #1 priority. Every sentence should pass the test: \
"Would the creator actually say this, in this exact way?"
2. Mirror the creator's sentence length distribution. If they favor short, \
punchy sentences, do the same. If they build long, flowing thoughts, match that.
3. Reproduce their vocabulary precisely—use their specific word choices, slang, \
technical jargon, and filler words. Do NOT substitute synonyms or "clean up" \
their language.
4. Match their energy and emotional register: if they're high-energy and \
exclamatory, be that; if they're calm and measured, be that.
5. Replicate structural habits: how they open (cold open vs. greeting), \
transition between ideas, and close (call-to-action style, sign-off phrase, etc.).
6. Incorporate their rhetorical devices: questions to the audience, callbacks, \
analogies, humor style, repetition patterns.
7. Never reference the voice profile, excerpts, or the fact that you are an AI. \
Write as if you ARE the creator."""


def _build_system_prompt(
    context: str,
    voice_profile: str | None,
    style_examples: list[str] | None = None,
) -> str:
    parts = [_BASE_INSTRUCTIONS, ""]

    if voice_profile:
        parts.append("=== VOICE PROFILE ===")
        parts.append(voice_profile)
        parts.append("=== END VOICE PROFILE ===")
        parts.append("")

    if style_examples:
        parts.append("=== STYLE EXAMPLES (mimic these closely) ===")
        for i, ex in enumerate(style_examples, 1):
            parts.append(f"[Example {i}]")
            parts.append(ex)
            parts.append("")
        parts.append("=== END STYLE EXAMPLES ===")
        parts.append("")

    parts.append("=== REFERENCE MATERIAL (for topic knowledge) ===")
    parts.append(context)
    parts.append("=== END REFERENCE MATERIAL ===")

    return "\n".join(parts)


def _build_user_prompt(topic: str, length_hint: str | None = None) -> str:
    prompt = f"Write a script about: {topic}"
    if length_hint:
        prompt += f"\n\nTarget length: {length_hint}"
    return prompt


def _fetch_style_examples(creator_username: str, limit: int = 5) -> list[str]:
    """Retrieve a diverse sample of the creator's chunks to serve as few-shot style examples."""
    dummy_vector = [0.0] * EMBEDDING_DIMENSIONS

    results = index.query(
        vector=dummy_vector,
        top_k=limit * 2,
        include_metadata=True,
        filter={
            "creator": creator_username,
            "type": "transcript_chunk",
        },
    )

    chunks = [
        match.metadata["text"]
        for match in (results.matches or [])
        if match.metadata and "text" in match.metadata
    ]
    # Take every other chunk for variety
    return chunks[::2][:limit]


def generate_script(
    topic: str,
    creator_username: str,
    length_hint: str | None = None,
    temperature: float = 0.6,
) -> str:
    """Query Pinecone for relevant transcript chunks and generate a script."""

    voice_profile = get_voice_profile(creator_username)

    embed_response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=topic,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    topic_vector = embed_response.data[0].embedding

    results = index.query(
        vector=topic_vector,
        top_k=TOP_K_CHUNKS,
        include_metadata=True,
        filter={
            "creator": creator_username,
            "type": "transcript_chunk",
        },
    )

    context_chunks = [
        match.metadata["text"]
        for match in (results.matches or [])
        if match.metadata and "text" in match.metadata
    ]
    context = "\n\n".join(context_chunks)

    style_examples = _fetch_style_examples(creator_username)
    system_prompt = _build_system_prompt(context, voice_profile, style_examples)

    completion = openai_client.chat.completions.create(
        model=GENERATION_MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": _build_user_prompt(topic, length_hint)},
        ],
    )

    return completion.choices[0].message.content
