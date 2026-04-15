"""Audio/video ingest and preprocessing using FFmpeg."""

import ffmpeg


def extract_audio(video_path: str, output_audio_path: str) -> bool:
    """Extract the audio track from an .mp4 file and save it as .mp3.

    Args:
        video_path: Path to the input .mp4 file.
        output_audio_path: Path for the output .mp3 file.

    Returns:
        True if extraction succeeded, False otherwise.
    """
    try:
        (
            ffmpeg
            .input(video_path)
            .output(output_audio_path, vn=None, loglevel="quiet")
            .overwrite_output()
            .run(quiet=True)
        )
        return True
    except ffmpeg.Error as e:
        if e.stderr:
            print(e.stderr.decode("utf8"))
        return False
