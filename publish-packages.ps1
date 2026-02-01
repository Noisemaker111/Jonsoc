# Publish script for jonsoc packages in dependency order

$ErrorActionPreference = "Stop"

Write-Host "Publishing jonsoc packages..." -ForegroundColor Green
Write-Host ""

# SDK first (no internal deps)
Write-Host "Publishing @jonsoc/sdk..." -ForegroundColor Cyan
Set-Location packages/sdk/js
npm publish --access public
Set-Location ../../..

# Script (no internal deps)
Write-Host "Publishing @jonsoc/script..." -ForegroundColor Cyan
Set-Location packages/script
npm publish --access public
Set-Location ../..

# Plugin (depends on SDK)
Write-Host "Publishing @jonsoc/plugin..." -ForegroundColor Cyan
Set-Location packages/plugin
npm publish --access public
Set-Location ../..

# Slack (depends on SDK)
Write-Host "Publishing @jonsoc/slack..." -ForegroundColor Cyan
Set-Location packages/slack
npm publish --access public
Set-Location ../..

# Convex (depends on nothing internal)
Write-Host "Publishing @jonsoc/convex..." -ForegroundColor Cyan
Set-Location packages/convex
npm publish --access public
Set-Location ../..

# Console Resource (no internal deps)
Write-Host "Publishing @jonsoc/console-resource..." -ForegroundColor Cyan
Set-Location packages/console/resource
npm publish --access public
Set-Location ../../..

# UI (depends on SDK)
Write-Host "Publishing @jonsoc/ui..." -ForegroundColor Cyan
Set-Location packages/ui
npm publish --access public
Set-Location ../..

# App (depends on SDK, UI)
Write-Host "Publishing @jonsoc/app..." -ForegroundColor Cyan
Set-Location packages/app
npm publish --access public
Set-Location ../..

# Web (depends on convex)
Write-Host "Publishing @jonsoc/web..." -ForegroundColor Cyan
Set-Location packages/web
npm publish --access public
Set-Location ../..

# Console App (depends on console-resource, UI)
Write-Host "Publishing @jonsoc/console-app..." -ForegroundColor Cyan
Set-Location packages/console/app
npm publish --access public
Set-Location ../../..

# Main jonsoc package (depends on SDK, plugin, script)
Write-Host "Publishing jonsoc (main package)..." -ForegroundColor Cyan
Set-Location packages/jonsoc
npm publish --access public
Set-Location ../..

Write-Host ""
Write-Host "All packages published successfully!" -ForegroundColor Green
