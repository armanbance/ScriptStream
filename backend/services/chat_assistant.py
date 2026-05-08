import json
import logging
import os
from collections.abc import Generator

from openai import OpenAI

from services.script_generator import generate_script

logger = logging.getLogger(__name__)

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

CHAT_MODEL = os.environ.get("GENERATION_MODEL", "gpt-4o")

_SYSTEM_PROMPT = """\
You are ScriptStream AI, a scriptwriting assistant for content creators. \
You help creators brainstorm ideas, refine hooks, improve pacing, give \
feedback on drafts, and answer questions about scripting and storytelling.

When the user explicitly asks you to generate or write a full script for a \
specific topic, use the generate_script tool. For everything else—questions, \
feedback, brainstorming, rewrites of short sections, or general advice—respond \
conversationally without calling any tools.

Guidelines:
- Be concise and direct. Creators are busy.
- When giving feedback, be specific. Quote the exact lines you're discussing.
- If the user's current script is provided, reference it naturally.
- When suggesting hooks, give 3-5 options so the creator can pick.
- Never fabricate analytics, stats, or audience data.
- You can discuss video structure, pacing, CTAs, thumbnail ideas, and \
  storytelling techniques."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "generate_script",
            "description": (
                "Generate a full script using the creator's voice profile and "
                "ingested reference material. Call this ONLY when the user "
                "explicitly asks to generate or write a complete script about "
                "a specific topic."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "The topic or idea the script should be about.",
                    },
                    "length_hint": {
                        "type": "string",
                        "description": (
                            "Optional target length like '60 seconds' or '2 minutes'."
                        ),
                    },
                },
                "required": ["topic"],
            },
        },
    }
]


def _build_messages(
    messages: list[dict],
    creator_username: str,
    editor_content: str | None,
) -> list[dict]:
    system = _SYSTEM_PROMPT

    if editor_content and editor_content.strip():
        system += (
            "\n\nThe creator currently has the following script open in their editor. "
            "Reference it when relevant:\n\n"
            f"--- CURRENT SCRIPT ---\n{editor_content.strip()}\n--- END SCRIPT ---"
        )

    return [{"role": "system", "content": system}, *messages]


def stream_chat(
    messages: list[dict],
    creator_username: str,
    editor_content: str | None = None,
) -> Generator[str, None, None]:
    full_messages = _build_messages(messages, creator_username, editor_content)

    stream = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=full_messages,
        tools=_TOOLS,
        stream=True,
    )

    tool_call_id = None
    tool_name = None
    tool_args_buf = ""

    for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta is None:
            continue

        finish_reason = chunk.choices[0].finish_reason

        if delta.content:
            yield f"data: {json.dumps({'type': 'token', 'content': delta.content})}\n\n"

        if delta.tool_calls:
            tc = delta.tool_calls[0]
            if tc.id:
                tool_call_id = tc.id
            if tc.function and tc.function.name:
                tool_name = tc.function.name
            if tc.function and tc.function.arguments:
                tool_args_buf += tc.function.arguments

        if finish_reason == "tool_calls" and tool_name == "generate_script":
            try:
                args = json.loads(tool_args_buf)
            except json.JSONDecodeError:
                args = {"topic": tool_args_buf}

            topic = args.get("topic", "")
            length_hint = args.get("length_hint")

            yield f"data: {json.dumps({'type': 'status', 'content': 'Generating script...'})}\n\n"

            try:
                script = generate_script(
                    topic,
                    creator_username,
                    length_hint=length_hint,
                )
            except Exception as e:
                logger.exception("Script generation failed during chat")
                yield f"data: {json.dumps({'type': 'error', 'detail': f'Script generation failed: {e}'})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'token', 'content': script})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
