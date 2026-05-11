param(
  [switch]$StartDocker
)

$ErrorActionPreference = "Stop"

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "== Pro Monitor local setup =="

if (-not (Test-Command "node")) {
  throw "Node.js non trovato nel PATH. Installa Node 20+."
}

if (-not (Test-Command "pnpm")) {
  throw "pnpm non trovato nel PATH. Installa pnpm e rilancia lo script."
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Creato file .env da .env.example"
}

pnpm install

if ($StartDocker) {
  if (-not (Test-Command "docker")) {
    Write-Warning "Docker non trovato. Salto avvio containers."
  } else {
    docker compose -f "infra/docker-compose.yml" up -d
  }
}

Write-Host ""
Write-Host "Setup completato."
Write-Host "Prossimi comandi:"
Write-Host "  1) docker compose -f infra/docker-compose.yml up -d"
Write-Host "  2) pnpm --filter @pro-monitor/server prisma:generate"
Write-Host "  3) pnpm dev"
