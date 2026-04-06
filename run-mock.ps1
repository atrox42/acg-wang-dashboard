$ErrorActionPreference = "Stop"

Write-Host "Starting mock-data stack with Docker Compose..."
docker compose up --build
