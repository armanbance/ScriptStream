# youtube caption fetcher - grabs transcript from a url and converts it
# into the format that rag_engine expects (text + segments)

import json
import logging
import re
import urllib.parse
import urllib.request
from typing import Any

from youtube_transcript_api import (
    CouldNotRetrieveTranscript,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApi,
)

logger = logging.getLogger(__name__)


class CaptionsUnavailable(Exception):
    """raised when there are no captions we can actually get for a video"""


# regex to check if something looks like a valid youtube video id (11 chars)
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def parse_video_id(url: str) -> str:
    """pull out the video id from basically any youtube url format

    handles watch links, youtu.be short links, /shorts/, and /embed/
    throws ValueError if we can't find a valid id
    """
    if not url or not url.strip():
        raise ValueError("URL is empty")

    # had to look this up - urlparse splits the url into parts
    parsed = urllib.parse.urlparse(url.strip())
    host = (parsed.hostname or "").lower()

    # ok so this just strips www. and m. and music. from the front
    for prefix in ("www.", "m.", "music."):
        if host.startswith(prefix):
            host = host[len(prefix):]
            break

    if host == "youtu.be":
        # short links put the id right in the path
        candidate = parsed.path.lstrip("/").split("/")[0]
    elif host in ("youtube.com", "youtube-nocookie.com"):
        if parsed.path == "/watch":
            qs = urllib.parse.parse_qs(parsed.query)
            candidate = (qs.get("v") or [""])[0]
        else:
            # handle /shorts/ /embed/ /v/ /live/ etc
            parts = [p for p in parsed.path.split("/") if p]
            if parts and parts[0] in ("shorts", "embed", "v", "live") and len(parts) >= 2:
                candidate = parts[1]
            else:
                candidate = ""
    else:
        raise ValueError(f"Not a YouTube URL: {url!r}")

    if not _VIDEO_ID_RE.match(candidate):
        raise ValueError(f"Could not extract a video ID from {url!r}")

    return candidate


def fetch_video_title(video_id: str) -> str:
    """get the video title using youtube's oembed thing

    returns empty string if it fails - title is just nice to have, not required
    """

    # oembed is a public endpoint that gives back basic video info as json
    oembed_url = (
        "https://www.youtube.com/oembed?url="
        + urllib.parse.quote(f"https://www.youtube.com/watch?v={video_id}", safe="")
        + "&format=json"
    )
    try:
        with urllib.request.urlopen(oembed_url, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return str(payload.get("title", "")).strip()
    except Exception as exc:
        logger.warning("oEmbed title fetch failed for %s: %s", video_id, exc)
        return ""


def _pick_transcript(video_id: str) -> Any:
    """tries to get english first, then falls back to whatever is available

    idk why youtube gives different formats but this handles it
    also some transcripts randomly fail to fetch even if they show up in the list,
    so we just skip those and try the next one
    """
    api = YouTubeTranscriptApi()

    try:
        transcripts = api.list(video_id)
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as exc:
        raise CaptionsUnavailable(str(exc)) from exc

    last_error: Exception | None = None

    # try english first (en, en-US, en-GB)
    try:
        return transcripts.find_transcript(["en", "en-US", "en-GB"]).fetch()
    except NoTranscriptFound:
        pass
    except Exception as exc:
        last_error = exc

    # fallback to any language if english isnt there
    for t in transcripts:
        try:
            return t.fetch()
        except Exception as exc:
            last_error = exc
            continue

    detail = f": {last_error}" if last_error else ""
    raise CaptionsUnavailable(f"No fetchable transcript in any language{detail}")


def fetch_captions(video_id: str) -> dict[str, Any]:
    """actually fetches and formats the captions for a video

    returns a dict with 'text' (full joined string) and 'segments' (list of chunks)
    same shape as what transcribe_audio returns so we can treat them the same
    """
    # this whole block is just error handling basically
    try:
        raw = _pick_transcript(video_id)
    except CaptionsUnavailable:
        raise
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as exc:
        raise CaptionsUnavailable(str(exc)) from exc
    except CouldNotRetrieveTranscript as exc:
        raise CaptionsUnavailable(str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error fetching captions for %s", video_id)
        raise CaptionsUnavailable(
            f"YouTube blocked the caption request or returned an empty body ({exc.__class__.__name__})."
        ) from exc

    # helper to get a field whether the segment is a dict or an object
    # spent like an hour on this, youtube_transcript_api changed its return type at some point
    def _get(seg: Any, key: str, default: Any) -> Any:
        if isinstance(seg, dict):
            return seg.get(key, default)
        return getattr(seg, key, default)

    # build the segments list, skip anything with no actual text
    segments = [
        {
            "text": _get(seg, "text", ""),
            "start": _get(seg, "start", 0.0),
            "duration": _get(seg, "duration", 0.0),
        }
        for seg in raw
        if str(_get(seg, "text", "")).strip()
    ]

    if not segments:
        raise CaptionsUnavailable("Captions returned but contained no text")

    # join all the text chunks into one big string
    full_text = " ".join(seg["text"] for seg in segments)
    return {"text": full_text, "segments": segments}
