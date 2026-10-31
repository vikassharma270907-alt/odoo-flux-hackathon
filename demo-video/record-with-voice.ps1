# Brightloop demo — record SCREEN + MIC straight to an MP4 using ffmpeg.
# One take = finished video you can upload to YouTube.
#
# HOW TO USE
#   1. Open brightloop-demo.html in your browser, press F (fullscreen), press R (reset to start).
#   2. Run this script in PowerShell:  ./record-with-voice.ps1
#   3. It counts down 5s, then records. DON'T touch this window.
#   4. Click your browser, press SPACE to play, and read NARRATION_SCRIPT.md aloud.
#   5. When the deck finishes (timer stops ~7:30), come back here and press  q  to stop.
#   6. Your video is saved as brightloop-demo.mp4 in this folder.

$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot 'brightloop-demo.mp4'

# Pick the mic. Change this string if you prefer the other device.
$mic = 'Microphone (2- Realtek(R) Audio)'

Write-Host ''
Write-Host '  Brightloop recorder (screen + mic)' -ForegroundColor Magenta
Write-Host '  Output : ' $out
Write-Host '  Mic    : ' $mic
Write-Host ''
Write-Host '  Make sure the deck is open, FULLSCREEN (F), and RESET (R).' -ForegroundColor Yellow
Write-Host '  Recording starts in...' -ForegroundColor Yellow
foreach ($n in 5..1) { Write-Host "    $n" -ForegroundColor Cyan; Start-Sleep 1 }
Write-Host '  RECORDING. Switch to the browser, press SPACE, narrate.' -ForegroundColor Green
Write-Host '  Press  q  in THIS window when the deck ends to stop & save.' -ForegroundColor Green
Write-Host ''

# gdigrab = whole desktop. 30fps, mp4 (H.264 + AAC), YouTube-friendly.
& ffmpeg -y `
  -f gdigrab -framerate 30 -i desktop `
  -f dshow -i "audio=$mic" `
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p `
  -c:a aac -b:a 192k `
  -movflags +faststart `
  "$out"

Write-Host ''
Write-Host "  Done. Saved to $out" -ForegroundColor Green
Write-Host '  Play it back before uploading to YouTube.' -ForegroundColor Green
