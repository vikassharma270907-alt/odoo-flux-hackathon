# Brightloop demo — record SCREEN ONLY (no audio) to an MP4 using ffmpeg.
# Use this if you want to add voiceover/music later in CapCut, Descript, Clipchamp, etc.
#
# HOW TO USE
#   1. Open brightloop-demo.html, press F (fullscreen), press R (reset).
#   2. Run:  ./record-silent.ps1
#   3. After the 5s countdown, click the browser and press SPACE to play.
#   4. When the deck finishes, return here and press  q  to stop.
#   5. Output: brightloop-demo-silent.mp4

$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot 'brightloop-demo-silent.mp4'

Write-Host ''
Write-Host '  Brightloop recorder (screen only)' -ForegroundColor Magenta
Write-Host '  Output : ' $out
Write-Host '  Deck must be open, FULLSCREEN (F), RESET (R).' -ForegroundColor Yellow
foreach ($n in 5..1) { Write-Host "    $n" -ForegroundColor Cyan; Start-Sleep 1 }
Write-Host '  RECORDING. Switch to the browser and press SPACE.' -ForegroundColor Green
Write-Host '  Press  q  here when the deck ends to stop & save.' -ForegroundColor Green
Write-Host ''

& ffmpeg -y `
  -f gdigrab -framerate 30 -i desktop `
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p `
  -movflags +faststart `
  "$out"

Write-Host ''
Write-Host "  Done. Saved to $out" -ForegroundColor Green
