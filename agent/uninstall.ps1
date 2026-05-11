param(
  [string]$ServiceName = "ProMonitorAgent",
  [string]$InstallPath = "C:\Program Files\ProMonitorAgent"
)

$ErrorActionPreference = "SilentlyContinue"

sc.exe stop $ServiceName | Out-Null
Start-Sleep -Seconds 2
sc.exe delete $ServiceName | Out-Null

if (Test-Path $InstallPath) {
  Remove-Item -Path $InstallPath -Recurse -Force
}

Write-Host "Servizio $ServiceName rimosso."
