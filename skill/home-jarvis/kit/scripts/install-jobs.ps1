# Adds the Windows Task Scheduler jobs. Tell the owner what each does and how often BEFORE running, and run only the ones he says yes to.
#   -Desk      : start the Jarvis desk when he signs in to Windows (once per sign-in)
#   -Paper     : build (and print) the morning paper every day at settings.build_time
#   -LockSync  : lock Jarvis the moment Windows locks (Win+L, lid closed, screen lock)
#   -Remove    : remove all three
param([switch]$Desk, [switch]$Paper, [switch]$LockSync, [switch]$Remove)
$kit = Split-Path -Parent $PSScriptRoot
$ps = "powershell.exe"
$common = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File"
$settingsSet = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
if ($Remove) { "Jarvis - Desk", "Jarvis - Morning paper", "Jarvis - Lock with Windows" | ForEach-Object { Unregister-ScheduledTask -TaskName $_ -Confirm:$false -ErrorAction SilentlyContinue }; "Removed."; exit }
if ($Desk) {
  $a = New-ScheduledTaskAction -Execute $ps -Argument "$common `"$kit\scripts\start-jarvis.ps1`""
  Register-ScheduledTask -TaskName "Jarvis - Desk" -Action $a -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME) -Settings $settingsSet -Force | Out-Null
  "Added: Jarvis desk starts when you sign in."
}
if ($Paper) {
  $s = Get-Content "$kit\me\settings.json" -Raw | ConvertFrom-Json
  $at = if ($s.build_time) { $s.build_time } else { "05:45" }
  $a = New-ScheduledTaskAction -Execute $ps -Argument "$common `"$kit\scripts\morning-paper.ps1`""
  Register-ScheduledTask -TaskName "Jarvis - Morning paper" -Action $a -Trigger (New-ScheduledTaskTrigger -Daily -At $at) -Settings $settingsSet -Force | Out-Null
  "Added: the paper is built (and printed if print_paper is on) every day at $at."
}
if ($LockSync) {
  $cls = Get-CimClass -Namespace ROOT\Microsoft\Windows\TaskScheduler -ClassName MSFT_TaskSessionStateChangeTrigger
  $t = New-CimInstance -CimClass $cls -ClientOnly
  $t.StateChange = 7   # 7 = the workstation was locked
  $t.Enabled = $true
  $a = New-ScheduledTaskAction -Execute $ps -Argument "$common `"$kit\scripts\lock-now.ps1`""
  Register-ScheduledTask -TaskName "Jarvis - Lock with Windows" -Action $a -Trigger $t -Settings $settingsSet -Force | Out-Null
  "Added: Jarvis locks whenever Windows locks."
}
