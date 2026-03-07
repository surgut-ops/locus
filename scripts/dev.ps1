# LOCUS - Full dev stack startup
# Prerequisites: Docker Desktop, pnpm

Write-Host "LOCUS Dev Stack" -ForegroundColor Cyan
docker compose up -d
Start-Sleep -Seconds 5
pnpm exec prisma migrate deploy
Write-Host "Start: pnpm dev" -ForegroundColor Green
