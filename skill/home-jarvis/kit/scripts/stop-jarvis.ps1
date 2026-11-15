# Stops the Jarvis desk server.
$kit = Split-Path -Parent $PSScriptRoot
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'server\.mjs' -and $_.CommandLine -notmatch 'node_modules' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Output "Jarvis desk stopped."
