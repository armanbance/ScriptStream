import json
import sys
from pathlib import Path

from dotenv import load_dotenv

# Allow running as: python -m scripts.fetch_trending  from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

load_dotenv()

from services.youtube_trending import fetch_trending, TrendingFetchError


# output goes two levels up into the data folder
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "trending.json"


def main() -> int:
    # writes to data/trending.json
    try:
        # category 28 is science & tech, 27 (education) doesnt work with the chart endpoint for some reason
        # just hardcoding 5 for now, could make it configurable later
        videos = fetch_trending(max_results=5, category_id=28)
    except TrendingFetchError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({"videos": videos}, indent=2))
    print(f"Wrote {len(videos)} videos to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
