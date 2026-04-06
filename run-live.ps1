$ErrorActionPreference = "Stop"

Write-Host "Starting live-data stack with Docker Compose..."
$env:MOCK_DATA_MODE = "false"
$env:NEXT_PUBLIC_MOCK_DATA_MODE = "false"
docker compose up --build
