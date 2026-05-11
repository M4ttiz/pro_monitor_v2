param(
  [string]$ApiBaseUrl = "http://localhost:3001",
  [string]$ApiKey = "",
  [string]$Site = "lab"
)

$RegistryPath = "HKLM:\SOFTWARE\ProMonitorAgent"
$RegistryValueName = "ApiKey"

function Get-OrCreateApiKey {
  param([string]$ProvidedApiKey)

  if (-not [string]::IsNullOrWhiteSpace($ProvidedApiKey)) {
    return $ProvidedApiKey
  }

  try {
    $existing = Get-ItemProperty -Path $RegistryPath -Name $RegistryValueName -ErrorAction Stop
    if (-not [string]::IsNullOrWhiteSpace($existing.$RegistryValueName)) {
      return $existing.$RegistryValueName
    }
  } catch {
    # No existing key in registry, create one below.
  }

  $newKey = [guid]::NewGuid().ToString()
  if (-not (Test-Path $RegistryPath)) {
    New-Item -Path $RegistryPath -Force | Out-Null
  }
  Set-ItemProperty -Path $RegistryPath -Name $RegistryValueName -Value $newKey -Force
  return $newKey
}

function Send-MetricWithBackoff {
  param(
    [string]$Uri,
    [string]$Body
  )

  $maxAttempts = 5
  $delay = 2

  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      Invoke-RestMethod `
        -Method Post `
        -Uri $Uri `
        -ContentType "application/json" `
        -Body $Body `
        -TimeoutSec 10 | Out-Null
      return $true
    } catch {
      if ($attempt -eq $maxAttempts) {
        Write-Warning "Ingest failed after $maxAttempts attempts: $($_.Exception.Message)"
        return $false
      }

      Write-Warning "Ingest attempt $attempt failed. Retry in $delay s"
      Start-Sleep -Seconds $delay
      $delay = [Math]::Min($delay * 2, 30)
    }
  }
}

function Get-CpuPercent {
  $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
  return [math]::Round($cpu, 2)
}

function Get-RamPercent {
  $os = Get-CimInstance Win32_OperatingSystem
  $total = [double]$os.TotalVisibleMemorySize
  $free = [double]$os.FreePhysicalMemory
  $usedPercent = (($total - $free) / $total) * 100
  return [math]::Round($usedPercent, 2)
}

function Get-DiskPercent {
  $drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 -and $_.Free -gt 0 }
  if ($drives.Count -eq 0) { return 0 }
  $values = @()
  foreach ($drive in $drives) {
    $total = [double]($drive.Used + $drive.Free)
    $pct = ($drive.Used / $total) * 100
    $values += $pct
  }
  return [math]::Round(($values | Measure-Object -Average).Average, 2)
}

Write-Host "Starting Pro Monitor Agent..."
$resolvedApiKey = Get-OrCreateApiKey -ProvidedApiKey $ApiKey
Write-Host "API key loaded: $($resolvedApiKey.Substring(0, 8))..."

while ($true) {
  $payload = @{
    apiKey      = $resolvedApiKey
    hostname    = $env:COMPUTERNAME
    site        = $Site
    cpuPercent  = Get-CpuPercent
    ramPercent  = Get-RamPercent
    diskPercent = Get-DiskPercent
  } | ConvertTo-Json

  $sent = Send-MetricWithBackoff -Uri "$ApiBaseUrl/api/v1/ingest" -Body $payload
  if ($sent) {
    Write-Host "$(Get-Date -Format o) metrics sent"
  }

  Start-Sleep -Seconds 15
}
