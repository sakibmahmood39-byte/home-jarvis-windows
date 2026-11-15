# Lists the printers Windows knows, HP first, with whether each is online and can print both sides.
$ErrorActionPreference = "SilentlyContinue"
$default = (Get-CimInstance Win32_Printer -Filter "Default=true").Name
$list = Get-Printer | ForEach-Object {
  $cfg = Get-PrintConfiguration -PrinterName $_.Name
  [pscustomobject]@{
    Name = $_.Name; Driver = $_.DriverName; Port = $_.PortName; Status = "$($_.PrinterStatus)"
    Default = ($_.Name -eq $default); Duplex = "$($cfg.DuplexingMode)"; IsHP = ($_.Name -match 'HP|Hewlett' -or $_.DriverName -match 'HP|Hewlett')
    Virtual = ($_.Name -match 'PDF|XPS|OneNote|Fax')
  }
} | Sort-Object @{e={-not $_.IsHP}}, @{e={$_.Virtual}}, Name
$list | ConvertTo-Json -Depth 3
