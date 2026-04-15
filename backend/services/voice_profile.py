"""Build, store, and retrieve per-creator voice profiles in Pinecone."""

import logging
import os

from openai import OpenAI
from pinecone import Pinecone

logger = logging.getLogger(__name__)

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("scriptstream")

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

_PROFILE_ID_PREFIX = "voice-profile-"

_ANALYSIS_PROMPT = """\
You are a linguistics and rhetoric expert. Analyze these transcript excerpts from \
a single content creator and produce a detailed voice profile that would allow \
someone to write new content indistinguishable from the original.

Cover ALL of the following dimensions:

TONE & ENERGY
- Overall emotional register (enthusiastic, dry, sarcastic, calm, intense, etc.)
- How energy shifts throughout a piece (builds up, stays flat, peaks and valleys)
- Emotional authenticity markers (vulnerability, bravado, self-deprecation)

VOCABULARY & LANGUAGE
- Reading level and complexity (casual/accessible vs. technical/academic)
- Distinctive word choices, pet words, and invented terms
- Slang, profanity level, and colloquialisms
- Domain-specific jargon and how they explain technical concepts to their audience
- Filler words and verbal tics (like, you know, right, basically, literally, etc.)

SENTENCE & RHYTHM PATTERNS
- Typical sentence length distribution (short/punchy, long/flowing, or mixed)
- Use of fragments, run-ons, or intentionally "broken" grammar
- Pacing: rapid-fire delivery vs. deliberate pausing for emphasis
- Repetition patterns (anaphora, callbacks, refrains)

STRUCTURAL HABITS
- How they open: cold open, greeting, hook question, shocking statement, etc.
- Transition style between ideas (smooth segues, hard cuts, "anyway...", "but here's the thing")
- How they close: call-to-action, sign-off catchphrase, cliffhanger, summary
- Use of numbered lists, tangents, or storytelling arcs

RHETORICAL DEVICES & AUDIENCE RELATIONSHIP
- Direct audience address patterns ("you guys", "y'all", "folks", "listen")
- Use of rhetorical questions and how they answer them
- Humor style (deadpan, self-deprecating, absurdist, observational, none)
- Analogies and metaphor preferences (pop culture, sports, everyday life, etc.)
- How they handle counterarguments or acknowledge other perspectives

SIGNATURE PHRASES
- List specific catchphrases, recurring expressions, and verbal signatures
- Note any greeting/sign-off formulas

Output ONLY the profile. Be specific and cite exact phrases from the transcripts \
as examples wherever possible. Do not be generic—this profile should only match \
THIS creator."""

MAX_SAMPLE_CHUNKS = 80


def _profile_id(creator_username: str) -> str:
    return f"{_PROFILE_ID_PREFIX}{creator_username}"


def build_voice_profile(creator_username: str) -> str:
    """Fetch a creator's transcript chunks from Pinecone and distill a voice profile."""

    dummy_vector = [0.0] * EMBEDDING_DIMENSIONS

    results = index.query(
        vector=dummy_vector,
        top_k=MAX_SAMPLE_CHUNKS,
        include_metadata=True,
        filter={
            "creator": creator_username,
            "type": "transcript_chunk",
        },
    )

    chunk_texts = [
        match.metadata["text"]
        for match in (results.matches or [])
        if match.metadata and "text" in match.metadata
    ]

    if not chunk_texts:
        return ""

    combined = "\n\n---\n\n".join(chunk_texts)

    completion = openai_client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        messages=[
            {"role": "system", "content": _ANALYSIS_PROMPT},
            {"role": "user", "content": combined},
        ],
    )

    return completion.choices[0].message.content


def store_voice_profile(creator_username: str, profile_text: str) -> None:
    """Embed and upsert the voice profile as a single Pinecone record."""

    if not profile_text:
        return

    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=profile_text,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    vector = response.data[0].embedding

    index.upsert(
        vectors=[
            {
                "id": _profile_id(creator_username),
                "values": vector,
                "metadata": {
                    "text": profile_text,
                    "creator": creator_username,
                    "type": "voice_profile",
                },
            }
        ]
    )


def get_voice_profile(creator_username: str) -> str | None:
    """Retrieve the stored voice profile for a creator, or None if absent."""

    result = index.fetch(ids=[_profile_id(creator_username)])

    vectors = result.vectors or {}
    record = vectors.get(_profile_id(creator_username))

    if record and record.metadata and "text" in record.metadata:
        return record.metadata["text"]

    return None
