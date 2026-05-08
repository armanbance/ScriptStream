"""Structured directing guidance generation for accepted scripts."""

import json
import os

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
GENERATION_MODEL = os.environ.get("GENERATION_MODEL", "gpt-4o")


class SceneDirection(BaseModel):
    id: str
    scriptExcerpt: str
    visualGoal: str
    location: str
    shots: list[str] = Field(default_factory=list)
    performanceDirection: str
    props: list[str] = Field(default_factory=list)


class BRollIdea(BaseModel):
    moment: str
    shot: str
    purpose: str


class DirectingPlan(BaseModel):
    overview: str
    scenes: list[SceneDirection] = Field(default_factory=list)
    bRoll: list[BRollIdea] = Field(default_factory=list)
    shootingTips: list[str] = Field(default_factory=list)
    creativeIdeas: list[str] = Field(default_factory=list)
    editingNotes: list[str] = Field(default_factory=list)


_SYSTEM_PROMPT = """\
You are a directing assistant for short-form creator videos. Given a finalized \
spoken script, produce a practical shooting plan that helps the creator film it.

Do not rewrite the script. Do not add new spoken lines unless a section \
explicitly asks for optional creative ideas. Convert the script into clear \
production guidance.

Return valid JSON only with this shape:
{
  "overview": string,
  "scenes": [
    {
      "id": string,
      "scriptExcerpt": string,
      "visualGoal": string,
      "location": string,
      "shots": string[],
      "performanceDirection": string,
      "props": string[]
    }
  ],
  "bRoll": [
    { "moment": string, "shot": string, "purpose": string }
  ],
  "shootingTips": string[],
  "creativeIdeas": string[],
  "editingNotes": string[]
}

Make the advice specific, filmable, and low-friction for a solo creator. \
Prefer concrete shot descriptions over generic advice. Keep each item concise.
"""


def _build_user_prompt(
    script: str,
    creator_username: str,
    platform: str | None,
    duration_hint: str | None,
    style: str | None,
    voice_profile: str | None,
) -> str:
    parts = [
        "Create a directing plan for this accepted script.",
        "",
        f"Creator: {creator_username}",
        f"Platform: {platform or 'short-form vertical video'}",
        f"Target duration: {duration_hint or 'infer from the script'}",
    ]
    if style:
        parts.append(f"Visual style: {style}")
    if voice_profile:
        parts.extend(
            [
                "",
                "Use this creator voice profile only for performance direction, "
                "pacing, and delivery notes. Do not rewrite the script.",
                voice_profile,
            ]
        )
    parts.extend(["", "Script:", script])
    return "\n".join(parts)


def _parse_directing_plan(raw: str | None) -> DirectingPlan:
    if not raw:
        raise ValueError("Directing plan response was empty")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Directing plan response was not valid JSON") from exc

    try:
        return DirectingPlan.model_validate(data)
    except ValidationError as exc:
        raise ValueError("Directing plan response did not match the schema") from exc


def generate_directing_plan(
    script: str,
    creator_username: str,
    platform: str | None = None,
    duration_hint: str | None = None,
    style: str | None = None,
    temperature: float = 0.4,
) -> DirectingPlan:
    """Generate structured filming guidance for an accepted script."""

    trimmed_script = script.strip()
    if not trimmed_script:
        raise ValueError("Script is required")

    from services.voice_profile import get_voice_profile

    voice_profile = get_voice_profile(creator_username)

    completion = openai_client.chat.completions.create(
        model=GENERATION_MODEL,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(
                    trimmed_script,
                    creator_username,
                    platform,
                    duration_hint,
                    style,
                    voice_profile,
                ),
            },
        ],
    )

    return _parse_directing_plan(completion.choices[0].message.content)
