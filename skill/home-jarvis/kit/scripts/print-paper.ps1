# Prints a PDF on the chosen printer (the HP), both sides when asked, and says only "printed" once the job has left the queue.
#   print-paper.ps1 -Pdf <file.pdf> [-Printer "HP ..."] [-Duplex]
param([Parameter(Mandatory = $true)][string]$Pdf, [string]$Printer = "", [switch]$Duplex)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $Pdf)) { Write-Output "NOT PRINTED: the file is missing ($Pdf)."; exit 1 }
if (-not $Printer) { $Printer = (Get-CimInstance Win32_Printer -Filter "Default=true").Name }
$p = Get-Printer -Name $Printer -ErrorAction SilentlyContinue
if (-not $p) { Write-Output "NOT PRINTED: Windows has no printer called '$Printer'. Run scripts\find-printer.ps1."; exit 2 }
if ("$($p.PrinterStatus)" -match 'Offline|Error|PaperOut|Jam') { Write-Output "NOT PRINTED: the printer says $($p.PrinterStatus). Check it is on, has paper and is on the Wi-Fi."; exit 3 }

$sumatra = @("$env:LOCALAPPDATA\SumatraPDF\SumatraPDF.exe", "$env:ProgramFiles\SumatraPDF\SumatraPDF.exe", "${env:ProgramFiles(x86)}\SumatraPDF\SumatraPDF.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
$before = @(Get-PrintJob -PrinterName $Printer -ErrorAction SilentlyContinue).Count
if ($sumatra) {
  $settings = if ($Duplex) { "duplexlong,fit" } else { "simplex,fit" }
  & $sumatra -print-to "$Printer" -print-settings $settings -silent -exit-when-done "$Pdf" | Out-Null
} else {
  # Fallback without SumatraPDF: hand the PDF to the PDF app's print command (may briefly open a window; one-sided unless the HP's own default is two-sided).
  Start-Process -FilePath $Pdf -Verb PrintTo -ArgumentList "`"$Printer`"" -WindowStyle Hidden
}
# Wait up to 3 minutes for the job to leave the queue.
$deadline = (Get-Date).AddMinutes(3)
Start-Sleep -Seconds 5
while ((Get-Date) -lt $deadline) {
  $jobs = @(Get-PrintJob -PrinterName $Printer -ErrorAction SilentlyContinue)
  $bad = $jobs | Where-Object { "$($_.JobStatus)" -match 'Error|Offline|PaperOut|Blocked' }
  if ($bad) { Write-Output "NOT PRINTED YET: the printer reports $($bad[0].JobStatus). Check paper and ink; it will print when fixed."; exit 4 }
  if ($jobs.Count -eq 0) { Write-Output "PRINTED on $Printer."; exit 0 }
  Start-Sleep -Seconds 5
}
Write-Output "STUCK: the job is still waiting at $Printer after 3 minutes. Check the printer is on and has paper."
exit 5
