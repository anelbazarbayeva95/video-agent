import os
import tempfile
import ffmpeg


def trim_video(video_bytes: bytes, ext: str, segments_to_remove: list[dict]) -> str:
    """
    Remove specified time segments from a video and return path to trimmed mp4.
    segments_to_remove: [{"start": float, "end": float}, ...]
    """
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(video_bytes)
        input_path = tmp.name

    probe = ffmpeg.probe(input_path)
    duration = float(probe["format"]["duration"])

    # Build list of segments to KEEP (inverse of removed)
    removed = sorted(segments_to_remove, key=lambda s: s["start"])
    keep = []
    cursor = 0.0

    for seg in removed:
        if seg["start"] > cursor:
            keep.append({"start": cursor, "end": seg["start"]})
        cursor = seg["end"]

    if cursor < duration:
        keep.append({"start": cursor, "end": duration})

    if not keep:
        raise ValueError("No segments left after removal")

    output_path = tempfile.mktemp(suffix=".mp4")

    if len(keep) == 1:
        seg = keep[0]
        (
            ffmpeg
            .input(input_path, ss=seg["start"], to=seg["end"])
            .output(output_path, vcodec="libx264", acodec="aac", format="mp4")
            .overwrite_output()
            .run(quiet=True)
        )
    else:
        # Concat multiple kept segments
        segment_files = []
        for i, seg in enumerate(keep):
            seg_path = tempfile.mktemp(suffix=f"_seg{i}.mp4")
            (
                ffmpeg
                .input(input_path, ss=seg["start"], to=seg["end"])
                .output(seg_path, vcodec="libx264", acodec="aac", format="mp4")
                .overwrite_output()
                .run(quiet=True)
            )
            segment_files.append(seg_path)

        # Write concat list
        list_path = tempfile.mktemp(suffix=".txt")
        with open(list_path, "w") as f:
            for seg_path in segment_files:
                f.write(f"file '{seg_path}'\n")

        (
            ffmpeg
            .input(list_path, format="concat", safe=0)
            .output(output_path, vcodec="libx264", acodec="aac", format="mp4")
            .overwrite_output()
            .run(quiet=True)
        )

        for seg_path in segment_files:
            os.unlink(seg_path)
        os.unlink(list_path)

    os.unlink(input_path)
    return output_path
