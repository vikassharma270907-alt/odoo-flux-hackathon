"""
Generate subtitles + chapters for the Brightloop demo, timed from the real
per-scene audio durations and the deck's aligned scene windows.

Outputs:
  brightloop-demo.srt   - sentence-level subtitles (SRT)
  chapters.txt          - YouTube chapter timestamps (paste into the description)

Subtitle timing: each scene's sentences are spread across the scene's actual
narration length (measured from audio/scene_NN.mp3), proportional to sentence
length. This keeps captions in step with the voice without a speech aligner.
"""
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "audio")

CHAPTER_TITLES = [
    "Intro - what Brightloop is",
    "Why subscriptions are hard",
    "Architecture (React -> Express -> PostgreSQL)",
    "Admin: catalogue, variants & discounts",
    "Subscription lifecycle state machine",
    "Run Billing - idempotent invoicing",
    "Payments & auto settlement",
    "Validation & role-based access",
    "Finance dashboard at scale",
    "Live app walkthrough",
    "Verification - 47 tests & live deploy",
    "Wrap up",
]


def audio_len(scene):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1",
         os.path.join(AUDIO, f"scene_{scene:02d}.mp3")],
        capture_output=True, text=True).stdout.strip()
    return float(out)


def split_sentences(text):
    # split on sentence end punctuation, keep it readable (merge very short bits)
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    merged, buf = [], ""
    for p in parts:
        if len(buf) + len(p) < 60 and buf:
            buf += " " + p
        else:
            if buf:
                merged.append(buf)
            buf = p
    if buf:
        merged.append(buf)
    return merged


def ts(seconds):
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def ts_short(seconds):
    s = int(round(seconds))
    m, s = divmod(s, 60)
    return f"{m}:{s:02d}"


def main():
    with open(os.path.join(HERE, "narration.json"), encoding="utf-8") as f:
        scenes = json.load(f)
    with open(os.path.join(HERE, "timing.json"), encoding="utf-8") as f:
        windows = json.load(f)["durations"]

    # cumulative scene start times
    starts, acc = [], 0.0
    for w in windows:
        starts.append(acc)
        acc += w

    srt_lines = []
    idx = 1
    for si, scene in enumerate(scenes):
        base = starts[si]
        narr = audio_len(scene["scene"])
        sents = split_sentences(scene["text"])
        total_chars = sum(len(s) for s in sents) or 1
        t = base
        for sent in sents:
            frac = len(sent) / total_chars
            dur = narr * frac
            start = t
            end = t + dur
            srt_lines.append(str(idx))
            srt_lines.append(f"{ts(start)} --> {ts(end)}")
            srt_lines.append(sent)
            srt_lines.append("")
            idx += 1
            t = end

    with open(os.path.join(HERE, "brightloop-demo.srt"), "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    print(f"Wrote brightloop-demo.srt ({idx-1} cues)")

    # chapters (YouTube requires the first at 0:00 and >= 3 chapters)
    chap = []
    for si, title in enumerate(CHAPTER_TITLES):
        chap.append(f"{ts_short(starts[si])} {title}")
    with open(os.path.join(HERE, "chapters.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(chap) + "\n")
    print("Wrote chapters.txt")
    print("\n".join(chap))


if __name__ == "__main__":
    main()
