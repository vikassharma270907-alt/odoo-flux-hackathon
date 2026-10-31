# Build a short (~70s) teaser cut from the full demo video.
# Picks the four strongest beats, re-encodes each cleanly, then concatenates.
#
#   ./make_teaser.ps1
#
# Output: brightloop-teaser.mp4  (1080p30, H.264 + AAC, ready to upload)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$src  = Join-Path $here 'brightloop-demo-video.mp4'
$tmp  = Join-Path $here '.teaser_tmp'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# Segment windows (start,duration) chosen from the final MP4 timeline.
$segments = @(
  @{ name='hook';      ss='0';   t='14' },   # title / what it is
  @{ name='billing';   ss='168'; t='18' },   # Run Billing idempotency moment
  @{ name='dashboard'; ss='276'; t='16' },   # finance dashboard at scale
  @{ name='close';     ss='396'; t='18' }    # closing summary
)

$list = Join-Path $tmp 'concat.txt'
if (Test-Path $list) { Remove-Item $list }

foreach ($seg in $segments) {
  $out = Join-Path $tmp "$($seg.name).mp4"
  Write-Host "  cutting $($seg.name): +$($seg.ss)s for $($seg.t)s" -ForegroundColor Cyan
  & ffmpeg -y -hide_banner -loglevel error `
    -ss $seg.ss -i $src -t $seg.t `
    -vf "fps=30,format=yuv420p,scale=1920:1080" `
    -c:v libx264 -profile:v high -preset veryfast -crf 19 `
    -c:a aac -b:a 256k -ar 48000 -avoid_negative_ts make_zero `
    $out
  # concat demuxer needs forward-slash paths, each quoted
  "file '$($out -replace '\\','/')'" | Add-Content -Encoding ascii $list
}

$final = Join-Path $here 'brightloop-teaser.mp4'
Write-Host "  concatenating -> brightloop-teaser.mp4" -ForegroundColor Cyan
& ffmpeg -y -hide_banner -loglevel error `
  -f concat -safe 0 -i $list `
  -c:v libx264 -profile:v high -preset veryfast -crf 19 -pix_fmt yuv420p `
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart `
  $final

Remove-Item -Recurse -Force $tmp
Write-Host "  Done: $final" -ForegroundColor Green
