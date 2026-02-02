#!/usr/bin/env bash
# Setup script for @jonsoc scoped packages on npm
# Run this once to create packages and configure trusted publishing

echo "=========================================="
echo "NPM Scoped Package Setup Guide"
echo "=========================================="
echo ""
echo "You need to manually create these packages on npmjs.com first:"
echo ""

PACKAGES=(
  "@jonsoc/util"
  "@jonsoc/env"
  "@jonsoc/sdk"
  "@jonsoc/script"
  "@jonsoc/plugin"
  "@jonsoc/slack"
  "@jonsoc/convex"
  "@jonsoc/ui"
  "@jonsoc/app"
  "@jonsoc/web"
  "@jonsoc/console-resource"
  "@jonsoc/console-app"
)

for pkg in "${PACKAGES[@]}"; do
  echo "  - $pkg"
done

echo ""
echo "=========================================="
echo "Steps for EACH package:"
echo "=========================================="
echo ""
echo "1. Go to https://www.npmjs.com/"
echo "2. Click 'Add Package' → 'Create a new package'"
echo "3. Enter the package name (e.g., @jonsoc/util)"
echo "4. Set it to PUBLIC"
echo "5. Click 'Create Package'"
echo "6. Go to the package page"
echo "7. Click 'Settings' tab"
echo "8. Under 'Publishing', find 'Trusted Publishers'"
echo "9. Click 'Add GitHub Actions as trusted publisher'"
echo "10. Enter:"
echo "    - Repository: Noisemaker111/Jonsoc"
echo "    - Workflow: build-release.yml"
echo "11. Click 'Save'"
echo ""
echo "=========================================="
echo "Quick Links (open each in a new tab):"
echo "=========================================="
echo ""

for pkg in "${PACKAGES[@]}"; do
  encoded_pkg="${pkg//\//%2F}"
  echo "https://www.npmjs.com/package/$pkg"
done

echo ""
echo "=========================================="
echo "After setting up all packages:"
echo "=========================================="
echo ""
echo "1. Re-run the failed GitHub Actions workflow"
echo "2. CI will now be able to publish automatically"
echo ""
echo "Note: You only need to do this ONCE. After trusted"
echo "publishing is set up, CI will handle all future publishes."
echo ""
