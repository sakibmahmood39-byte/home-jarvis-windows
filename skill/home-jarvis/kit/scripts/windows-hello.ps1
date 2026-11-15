# Asks Windows Hello (fingerprint, face or the Windows PIN) to confirm the owner is at the PC.
# Prints exactly one line: Verified, Canceled, ... or unavailable:<why>. Needs Windows PowerShell 5.1 (powershell.exe).
param([string]$Message = "Unlock Jarvis")
$ErrorActionPreference = "Stop"
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
  function Await($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
  $V = [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime]
  $avail = Await ($V::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
  if ("$avail" -ne "Available") { Write-Output "unavailable:$avail"; exit 2 }
  $r = Await ($V::RequestVerificationAsync($Message)) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])
  Write-Output "$r"
  if ("$r" -eq "Verified") { exit 0 } else { exit 1 }
} catch { Write-Output "unavailable:$($_.Exception.Message)"; exit 2 }
