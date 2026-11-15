# Starts the Jarvis desk (hidden server on this PC only) and opens it as its own Edge window.
$kit = Split-Path -Parent $PSScriptRoot
$settings = Get-Content (Join-Path $kit "me\settings.json") -Raw | ConvertFrom-Json
$port = if ($settings.port) { $settings.port } else { 3777 }
$up = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $up) {
  New-Item -ItemType Directory -Force -Path (Join-Path $kit "me\logs") | Out-Null
  Start-Process -FilePath "node" -ArgumentList "server.mjs" -WorkingDirectory $kit -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $kit "me\logs\server-out.log") -RedirectStandardError (Join-Path $kit "me\logs\server-err.log")
  Start-Sleep -Seconds 2
}
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($edge) { Start-Process $edge "--app=http://127.0.0.1:$port" } else { Start-Process "http://127.0.0.1:$port" }
