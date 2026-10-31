"""
Generate per-scene narration MP3s with edge-tts, then assemble one full audio
track where each scene's voice starts exactly when that scene appears in the deck.

Output:
  audio/scene_01.mp3 ... scene_12.mp3   (raw narration per scene)
  audio/voiceover.m4a                   (full track, synced to scene start times)

Usage:
  python make_audio.py           # synth missing scenes, then assemble
  python make_audio.py assemble  # only (re)assemble from existing scene mp3s
  python make_audio.py force     # re-synth every scene from scratch
"""
import asyncio
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "audio")
VOICE = "en-US-AndrewNeural"   # warm, natural male narrator
RATE = "+6%"                    # slightly brisk so narration fits the scene window
MAX_RETRIES = 4

os.makedirs(AUDIO, exist_ok=True)


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def scene_path(n):
    return os.path.join(AUDIO, f"scene_{n:02d}.mp3")


def is_good(path):
    return os.path.exists(path) and os.path.getsize(path) > 2000 and duration(path) > 0.5


async def synth_one(scene, force=False):
    import edge_tts
    path = scene_path(scene["scene"])
    if is_good(path) and not force:
        print(f"  scene {scene['scene']:>2}  skip (already good, {duration(path):.1f}s)")
        return
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            tmp = path + ".part"
            communicate = edge_tts.Communicate(scene["text"], VOICE, rate=RATE)
            await asyncio.wait_for(communicate.save(tmp), timeout=60)
            if os.path.getsize(tmp) > 2000:
                os.replace(tmp, path)
                print(f"  scene {scene['scene']:>2}  ok  ({duration(path):.1f}s)")
                return
            raise RuntimeError("empty output")
        except Exception as e:  # noqa: BLE001
            print(f"  scene {scene['scene']:>2}  attempt {attempt} failed: {e}")
            if os.path.exists(path + ".part"):
                os.remove(path + ".part")
            await asyncio.sleep(2 * attempt)
    raise SystemExit(f"Failed to synthesize scene {scene['scene']} after {MAX_RETRIES} tries")


async def synth(scenes, force=False):
    for s in scenes:
        await synth_one(s, force=force)


def assemble(scenes):
    # Prefer aligned windows from timing.json (written by plan_timing.py) so the
    # voiceover starts each scene exactly when the rendered deck advances.
    timing_path = os.path.join(HERE, "timing.json")
    windows = None
    if os.path.exists(timing_path):
        with open(timing_path, encoding="utf-8") as f:
            windows = json.load(f)["durations"]

    starts, acc = [], 0.0
    for idx, s in enumerate(scenes):
        starts.append(acc)
        acc += (windows[idx] if windows else s["dur"])
    total = acc

    inputs, filters = [], []
    for idx, s in enumerate(scenes):
        inputs += ["-i", scene_path(s["scene"])]
        start_ms = int(starts[idx] * 1000)
        filters.append(f"[{idx}:a]adelay={start_ms}|{start_ms}[a{idx}]")

    mix_inputs = "".join(f"[a{idx}]" for idx in range(len(scenes)))
    filter_complex = (
        ";".join(filters)
        + f";{mix_inputs}amix=inputs={len(scenes)}:duration=longest:normalize=0[mix]"
        + f";[mix]apad,atrim=0:{total}[out]"
    )

    out = os.path.join(AUDIO, "voiceover.m4a")
    cmd = (["ffmpeg", "-y"] + inputs +
           ["-filter_complex", filter_complex, "-map", "[out]",
            "-c:a", "aac", "-b:a", "192k", out])
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:])
        raise SystemExit("ffmpeg assemble failed")
    print(f"\n  Assembled voiceover: {out}  ({total:.0f}s target)")

    print("\n  Per-scene fit (narration vs scene window):")
    for idx, s in enumerate(scenes):
        d = duration(scene_path(s["scene"]))
        win = windows[idx] if windows else s["dur"]
        flag = "ok " if d <= win else "OVER"
        print(f"    scene {s['scene']:>2}: {d:6.1f}s  /  {win:>3}s   {flag}")
    return out, total


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    with open(os.path.join(HERE, "narration.json"), encoding="utf-8") as f:
        scenes = json.load(f)

    if mode == "assemble":
        assemble(scenes)
        return
    print(f"Generating narration with {VOICE} (rate {RATE})\n")
    asyncio.run(synth(scenes, force=(mode == "force")))
    assemble(scenes)


if __name__ == "__main__":
    main()
