import ffmpeg


def extract_audio(video_path: str, output_audio_path: str) -> bool:
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
