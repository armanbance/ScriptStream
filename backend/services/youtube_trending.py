import os
from typing import Any

import requests

# youtube api base url
YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"


class TrendingFetchError(Exception):
    pass


def fetch_trending(
    max_results: int = 5,
    region: str = "US",
    category_id: int | None = None,
) -> list[dict[str, Any]]:
    # youtube api key has to be set as an env var
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        raise TrendingFetchError("YOUTUBE_API_KEY env var is not set")

    # this builds the params dict for the api call
    params: dict[str, Any] = {
        "part": "snippet,statistics",
        "chart": "mostPopular",
        "maxResults": max_results,
        "regionCode": region,
        "key": api_key,
    }
    if category_id is not None:
        params["videoCategoryId"] = category_id

    resp = requests.get(YOUTUBE_API_URL, params=params, timeout=15)
    if resp.status_code != 200:
        raise TrendingFetchError(
            f"YouTube API returned {resp.status_code}: {resp.text[:200]}"
        )

    data = resp.json()
    items = data.get("items", [])

    videos: list[dict[str, Any]] = []
    for item in items:
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        thumbnails = snippet.get("thumbnails", {})

        # medium thumbnail is good enough, fall back to high or default if needed
        thumb = (
            thumbnails.get("medium")
            or thumbnails.get("high")
            or thumbnails.get("default")
            or {}
        )

        videos.append({
            "video_id": item.get("id", ""),
            "title": snippet.get("title", ""),
            "channel": snippet.get("channelTitle", ""),
            "thumbnail_url": thumb.get("url", ""),
            # view_count comes back as a string so gotta convert it
            "view_count": int(stats.get("viewCount", 0)),
            "url": f"https://www.youtube.com/watch?v={item.get('id', '')}",
        })

    return videos
