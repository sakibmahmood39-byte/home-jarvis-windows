# Builds today's paper and (if print_paper is true) prints it on the HP. Run by the "Jarvis - Morning paper" task.
#   1. Claude writes me\editions\<date>.json by following me\PAPER.md (his own runbook from the questionnaire).
#   2. paper\build.mjs turns it into me\papers\<date>.pdf (Edge, no window).
#   3. print-paper.ps1 prints it and checks it really came out.
param([switch]$NoPrint)
$ErrorActionPreference = "Continue"
$kit = Split-Path -Parent $PSScriptRoot
Set-Location $kit
$settings = Get-Content "me\settings.json" -Raw | ConvertFrom-Json
$date = Get-Date -Format "yyyy-MM-dd"
New-Item -ItemType Directory -Force -Path "me\editions", "me\papers", "me\logs" | Out-Null
$log = "me\logs\paper.log"
function Log($m) { "$(Get-Date -Format s) $m" | Add-Content $log; Write-Output $m }

$edition = "me\editions\$date.json"
if ($NoPrint -and (Test-Path $edition)) { Remove-Item $edition }  # "Build again" from the app writes a fresh edition
if (-not (Test-Path $edition)) {
  $tools = ($settings.paper_tools + @("Write(me/editions/**)", "Bash(node tools/today-data.mjs*)")) -join ","
  $prompt = "Build today's paper ($date). Follow me/PAPER.md exactly. Write only me/editions/$date.json. Start by running: node tools/today-data.mjs"
  $prompt | claude -p --allowedTools $tools --no-session-persistence --output-format text 2>&1 | Add-Content $log
}
if (-not (Test-Path $edition)) { Log "NO PAPER: Claude did not write $edition. See $log."; exit 1 }

$pdf = "me\papers\$date.pdf"
node paper\build.mjs $edition $pdf 2>&1 | Add-Content $log
if ($LASTEXITCODE -eq 3) { Log "Paper built but some text runs past the page bottom; shorten it in $edition and run again." }
if (-not (Test-Path $pdf)) { Log "NO PAPER: the PDF was not made. See $log."; exit 1 }
Log "Paper ready: $pdf"

if ($settings.print_paper -and -not $NoPrint) {
  $pp = @{ Pdf = (Resolve-Path $pdf).Path }
  if ($settings.printer) { $pp.Printer = $settings.printer }
  if ($settings.duplex) { $pp.Duplex = $true }
  $r = & (Join-Path $PSScriptRoot "print-paper.ps1") @pp
  Log "$r"
}
