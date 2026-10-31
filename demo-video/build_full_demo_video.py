import os
import subprocess
import glob

DEMO_DIR = "d:/odoo flux hackathon/demo-video"
AUDIO_DIR = "d:/odoo flux hackathon/demo-video/audio"
SLIDES_DIR = "d:/slides"
OUTPUT_VIDEO = "d:/odoo flux hackathon/demo-video/brightloop-demo-video.mp4"

SCENE_TITLES = [
    "Platform Overview & Tech Stack",
    "The Core Subscription Dilemma",
    "3-Tier Architecture & Clean Flow",
    "Admin Catalogue & Odoo Variant (+₹560)",
    "Quotation to Subscription Lifecycle",
    "Signature Moment: Idempotent Billing",
    "Partial Payments & Auto-Settlement",
    "Strict Role-Based Access Control (RBAC)",
    "Finance Dashboard & Sub-40ms Scale",
    "47 Passing Tests & Rigorous Proof",
    "Conclusion & Production Readiness"
]

def build_video():
    os.makedirs(SLIDES_DIR, exist_ok=True)
    temp_videos = []
    
    total_time = 0.0
    durations = []
    for i in range(1, 12):
        audio_path = f"{AUDIO_DIR}/scene_{i:02d}.mp3"
        dur_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audio_path]
        dur = float(subprocess.check_output(dur_cmd).decode().strip())
        durations.append(dur)
        total_time += dur
    
    print(f"Total video duration will be: {total_time:.2f} seconds ({total_time/60:.2f} minutes)")

    cumulative_time = 0.0
    for i in range(1, 12):
        scene_id = f"scene_{i:02d}"
        slide_img = f"{SLIDES_DIR}/{scene_id}.png"
        audio_file = f"{AUDIO_DIR}/{scene_id}.mp3"
        out_temp = f"{SLIDES_DIR}/part_{scene_id}.mp4"
        dur = durations[i-1]
        title = SCENE_TITLES[i-1]
        
        # Calculate timestamps for HUD
        mins = int(cumulative_time // 60)
        secs = int(cumulative_time % 60)
        hud_text = f"Scene {i:02d}/11: {title}"
        
        print(f"Encoding {scene_id} ({dur:.2f}s)...")
        
        # Video filter:
        # 1. 1080p scale
        # 2. Animated progress bar across the top
        # 3. Subtle animated highlight bar at the bottom
        vf = (
            f"scale=1920:1080,"
            f"drawbox=x=0:y=0:w='(t/{dur})*1920':h=8:color=#017E84@1:t=fill,"
            f"drawbox=x=0:y=1072:w='({(cumulative_time):.2f}+t)/{total_time:.2f}*1920':h=8:color=#714B67@1:t=fill"
        )
        
        cmd = [
            'ffmpeg', '-y',
            '-loop', '1', '-i', slide_img,
            '-i', audio_file,
            '-vf', vf,
            '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k',
            '-t', str(dur),
            out_temp
        ]
        subprocess.run(cmd, check=True)
        temp_videos.append(out_temp)
        cumulative_time += dur

    # Create concat list
    concat_list_file = f"{SLIDES_DIR}/concat_list.txt"
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for v in temp_videos:
            f.write(f"file '{v}'\n")

    print("Concatenating all parts into final demo video...")
    concat_cmd = [
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0',
        '-i', concat_list_file,
        '-c', 'copy',
        OUTPUT_VIDEO
    ]
    subprocess.run(concat_cmd, check=True)
    print(f"FINAL VIDEO GENERATED SUCCESSFULLY at: {OUTPUT_VIDEO}")

    # Inspect final video
    info_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=noprint_wrappers=1', OUTPUT_VIDEO]
    print(subprocess.check_output(info_cmd).decode())

if __name__ == "__main__":
    build_video()
