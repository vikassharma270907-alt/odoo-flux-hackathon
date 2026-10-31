"""
Mux the silent deck capture (build/brightloop-deck.webm) with the narration
(audio/voiceover.m4a) into a YouTube-ready MP4.

Output:
  brightloop-demo.mp4   (1920x1080, H.264 High + AAC, faststart, ~30fps)

- Scales the 1280x720 vector capture up to 1080p with lanczos (stays crisp).
- Trims both streams to the deck length so there's no trailing silence/freeze.
- Adds a 0.6s fade in and a 1.2s fade out on both video and audio.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.join(HERE, "build", "brightloop-deck.webm")
AUDIO = os.path.join(HERE, "audio", "voiceover.m4a")
OUT = os.path.join(HERE, "brightloop-demo.mp4")


def seconds():
    tj = os.path.join(HERE, "timing.json")
    if os.path.exists(tj):
        with open(tj, encoding="utf-8") as f:
            return json.load(f)["total"]
    return 468


def main():
    if not os.path.exists(VIDEO):
        sys.exit(f"Missing capture: {VIDEO} (run: node render.js)")
    if not os.path.exists(AUDIO):
        sys.exit(f"Missing voiceover: {AUDIO} (run: python make_audio.py)")

    total = seconds()
    vfade_out = max(0, total - 1.2)
    afade_out = max(0, total - 1.2)

    vf = (f"scale=1920:1080:flags=lanczos,fps=30,format=yuv420p,"
          f"fade=t=in:st=0:d=0.6,fade=t=out:st={vfade_out}:d=1.2")
    af = (f"afade=t=in:st=0:d=0.6,afade=t=out:st={afade_out}:d=1.2")

    cmd = [
        "ffmpeg", "-y",
        "-i", VIDEO,
        "-i", AUDIO,
        "-map", "0:v:0", "-map", "1:a:0",
        "-t", str(total),
        "-vf", vf,
        "-af", af,
        "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart",
        "-r", "30",
        OUT,
    ]
    print("Encoding YouTube-ready MP4 ->", OUT)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:])
        sys.exit("ffmpeg encode failed")

    # report
    info = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration,size:stream=codec_type,codec_name,width,height",
         "-of", "default=noprint_wrappers=1", OUT],
        capture_output=True, text=True).stdout
    print("\nDone.\n" + info)


if __name__ == "__main__":
    main()
