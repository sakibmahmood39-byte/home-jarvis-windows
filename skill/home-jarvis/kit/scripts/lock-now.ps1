# Locks Jarvis at once (used by the "lock Jarvis when Windows locks" task, or by hand).
$kit = Split-Path -Parent $PSScriptRoot
$settings = Get-Content (Join-Path $kit "me\settings.json") -Raw | ConvertFrom-Json
$port = if ($settings.port) { $settings.port } else { 3777 }
$token = (Get-Content (Join-Path $kit "me\.local-token") -Raw).Trim()
try { Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$port/api/lock" -Headers @{ "x-jarvis-local" = $token } -Body '{"why":"Windows locked"}' -ContentType "application/json" | Out-Null } catch {}
