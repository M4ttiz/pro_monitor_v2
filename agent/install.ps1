param(
  [string]$InstallPath = "C:\Program Files\ProMonitorAgent",
  [string]$ServiceName = "ProMonitorAgent",
  [string]$ApiBaseUrl = "http://localhost:3001",
  [string]$Site = "lab"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InstallPath)) {
  New-Item -Path $InstallPath -ItemType Directory -Force | Out-Null
}

Copy-Item -Path "$PSScriptRoot\ProMonitorAgent.ps1" -Destination "$InstallPath\ProMonitorAgent.ps1" -Force

$serviceCommand = "powershell.exe -ExecutionPolicy Bypass -File `"$InstallPath\ProMonitorAgent.ps1`" -ApiBaseUrl `"$ApiBaseUrl`" -Site `"$Site`""

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  sc.exe stop $ServiceName | Out-Null
  sc.exe delete $ServiceName | Out-Null
  Start-Sleep -Seconds 1
}

New-Service `
  -Name $ServiceName `
  -BinaryPathName $serviceCommand `
  -DisplayName "Pro Monitor Agent" `
  -Description "Pro Monitor Windows telemetry agent" `
  -StartupType Automatic | Out-Null

Start-Service -Name $ServiceName

Write-Host "Servizio $ServiceName installato e avviato."
