# One-time setup on Windows: checks Node.js and SumatraPDF (free, for silent printing), installs the paper fonts,
# and creates the private me\ folder from me.example\. Safe to run again.
$ErrorActionPreference = "Continue"
$kit = Split-Path -Parent $PSScriptRoot
Set-Location $kit
function Have($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
if (-not (Have node)) { "Installing Node.js LTS (free)..."; winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent; $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
$sumatra = @("$env:LOCALAPPDATA\SumatraPDF\SumatraPDF.exe", "$env:ProgramFiles\SumatraPDF\SumatraPDF.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sumatra) { "Installing SumatraPDF (free PDF reader, used to print without pop-ups)..."; winget install -e --id SumatraPDF.SumatraPDF --accept-source-agreements --accept-package-agreements --silent }
npm install --no-audit --no-fund
if (-not (Test-Path "me")) { Copy-Item "me.example" "me" -Recurse; "Created me\ (private: never share or upload this folder)." }
New-Item -ItemType Directory -Force -Path "me\editions", "me\papers", "me\logs", "me\notes" | Out-Null
"node: $(node -v)"
"claude: $(claude --version 2>$null)"
"Setup done."
