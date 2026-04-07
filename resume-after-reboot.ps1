$ErrorActionPreference = "Stop"

function Test-DockerReady {
  try {
    docker info | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Start-DockerDesktopIfNeeded {
  if (Test-DockerReady) {
    return
  }

  $candidates = @(
    "C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  )

  $dockerDesktop = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

  if (-not $dockerDesktop) {
    throw "Docker Desktop executable was not found."
  }

  Write-Host "Starting Docker Desktop..."
  Start-Process -FilePath $dockerDesktop | Out-Null

  $maxAttempts = 120
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    Start-Sleep -Seconds 2
    if (Test-DockerReady) {
      Write-Host "Docker Desktop is ready."
      return
    }
  }

  throw "Docker Desktop did not become ready in time."
}

Write-Host "Resuming ACG WANG local stack..."
Set-Location $PSScriptRoot

Start-DockerDesktopIfNeeded

Write-Host "Starting containers..."
docker compose up --build -d

Write-Host "Checking services..."
$frontendOk = $false
$backendOk = $false

for ($attempt = 1; $attempt -le 30; $attempt++) {
  Start-Sleep -Seconds 2

  try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
      $frontendOk = $true
    }
  } catch {}

  try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
      $backendOk = $true
    }
  } catch {}

  if ($frontendOk -and $backendOk) {
    break
  }
}

if (-not $frontendOk) {
  throw "Frontend did not respond on http://localhost:3000/login"
}

if (-not $backendOk) {
  throw "Backend did not respond on http://localhost:8000/api/health"
}

Write-Host ""
Write-Host "Ready:"
Write-Host "  Login:   http://localhost:3000/login"
Write-Host "  App:     http://localhost:3000"
Write-Host "  Backend: http://localhost:8000/api/health"
Write-Host ""
Write-Host "Test login:"
Write-Host "  admin / admin1234"
Write-Host "  admin2 / admin1234"
