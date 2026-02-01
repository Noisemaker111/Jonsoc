# Build script for jonsoc binaries (Windows PowerShell)
# Usage: .\build-binaries.ps1 [version]

$ErrorActionPreference = "Stop"

# Get version from argument or package.json
if ($args[0]) {
    $VERSION = $args[0]
} else {
    $packageJson = Get-Content packages\jonsoc\package.json | ConvertFrom-Json
    $VERSION = $packageJson.version
}

Write-Host "Building jonsoc binaries version $VERSION" -ForegroundColor Green

Set-Location packages\jonsoc

# Create dist directory if it doesn't exist
New-Item -ItemType Directory -Force -Path dist | Out-Null

Write-Host "Building for Linux x64..." -ForegroundColor Cyan
& bun build --target=bun-linux-x64 --outfile=dist\jonsoc-linux-x64 src\index.ts

Write-Host "Building for macOS ARM64..." -ForegroundColor Cyan
& bun build --target=bun-darwin-arm64 --outfile=dist\jonsoc-darwin-arm64 src\index.ts

Write-Host "Building for Windows x64..." -ForegroundColor Cyan
& bun build --target=bun-windows-x64 --outfile=dist\jonsoc-windows-x64.exe src\index.ts

Write-Host "Creating archives..." -ForegroundColor Cyan
Set-Location dist

# Linux - using tar if available, otherwise just copy
try {
    & tar -czf jonsoc-linux-x64.tar.gz jonsoc-linux-x64
    Write-Host "Created jonsoc-linux-x64.tar.gz"
} catch {
    Write-Host "Note: tar not available, Linux archive not created"
}

# macOS
try {
    Compress-Archive -Path jonsoc-darwin-arm64 -DestinationPath jonsoc-darwin-arm64.zip -Force
    Write-Host "Created jonsoc-darwin-arm64.zip"
} catch {
    Write-Host "Note: Could not create macOS archive"
}

# Windows
try {
    Compress-Archive -Path jonsoc-windows-x64.exe -DestinationPath jonsoc-windows-x64.zip -Force
    Write-Host "Created jonsoc-windows-x64.zip"
} catch {
    Write-Host "Note: Could not create Windows archive"
}

Set-Location ..\..

Write-Host ""
Write-Host "Build complete! Binaries are in packages\jonsoc\dist\" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create a GitHub release with tag v$VERSION" -ForegroundColor White
Write-Host "2. Upload these files to the release:" -ForegroundColor White
Write-Host "   - packages\jonsoc\dist\jonsoc-linux-x64.tar.gz" -ForegroundColor White
Write-Host "   - packages\jonsoc\dist\jonsoc-darwin-arm64.zip" -ForegroundColor White
Write-Host "   - packages\jonsoc\dist\jonsoc-windows-x64.zip" -ForegroundColor White
