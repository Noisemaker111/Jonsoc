#!/bin/bash
# Build script for jonsoc binaries
# Usage: ./build-binaries.sh [version]

set -e

VERSION=${1:-$(cat packages/jonsoc/package.json | grep '"version"' | head -1 | cut -d'"' -f4)}
echo "Building jonsoc binaries version $VERSION"

cd packages/jonsoc

echo "Building for Linux x64..."
bun build --target=bun-linux-x64 --outfile=dist/jonsoc-linux-x64 src/index.ts

echo "Building for macOS ARM64..."
bun build --target=bun-darwin-arm64 --outfile=dist/jonsoc-darwin-arm64 src/index.ts

echo "Building for Windows x64..."
bun build --target=bun-windows-x64 --outfile=dist/jonsoc-windows-x64.exe src/index.ts

echo "Creating archives..."
cd dist

# Linux
tar -czf jonsoc-linux-x64.tar.gz jonsoc-linux-x64

# macOS  
zip -j jonsoc-darwin-arm64.zip jonsoc-darwin-arm64

# Windows
zip -j jonsoc-windows-x64.zip jonsoc-windows-x64.exe

cd ../..

echo ""
echo "Build complete! Binaries are in packages/jonsoc/dist/"
echo ""
echo "Next steps:"
echo "1. Create a GitHub release with tag v$VERSION"
echo "2. Upload these files to the release:"
echo "   - packages/jonsoc/dist/jonsoc-linux-x64.tar.gz"
echo "   - packages/jonsoc/dist/jonsoc-darwin-arm64.zip"
echo "   - packages/jonsoc/dist/jonsoc-windows-x64.zip"
