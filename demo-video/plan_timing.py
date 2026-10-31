"""
Compute aligned per-scene durations so the deck's visuals and the narration stay
in sync. Each scene gets max(original_window, narration_length + TAIL), rounded up.

Writes timing.json: { "durations": [...], "total": N }
Prints the ?dur= string for render.js.
"""
import json
import math
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "audio")
TAIL = 1.3   # breathing room after each narration (seconds)


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True).stdout.strip()
    return float(out)


def main():
    with open(os.path.join(HERE, "narration.json"), encoding="utf-8") as f:
        scenes = json.load(f)

    durations = []
    for s in scenes:
        narr = duration(os.path.join(AUDIO, f"scene_{s['scene']:02d}.mp3"))
        window = max(s["dur"], narr + TAIL)
        durations.append(int(math.ceil(window)))

    total = sum(durations)
    with open(os.path.join(HERE, "timing.json"), "w", encoding="utf-8") as f:
        json.dump({"durations": durations, "total": total}, f, indent=2)

    print("Aligned scene durations (s):", durations)
    print("Total:", total, "s  (", f"{total//60}:{total%60:02d}", ")")
    print("dur param:", ",".join(str(d) for d in durations))


if __name__ == "__main__":
    main()
