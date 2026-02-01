#!/bin/bash
# Publish script for jonsoc packages in dependency order

set -e

echo "Publishing jonsoc packages..."
echo ""

# SDK first (no internal deps)
echo "📦 Publishing @jonsoc/sdk..."
cd packages/sdk/js
npm publish --access public
cd ../../..

# Script (no internal deps)
echo "📦 Publishing @jonsoc/script..."
cd packages/script
npm publish --access public
cd ../..

# Plugin (depends on SDK)
echo "📦 Publishing @jonsoc/plugin..."
cd packages/plugin
npm publish --access public
cd ../..

# Slack (depends on SDK)
echo "📦 Publishing @jonsoc/slack..."
cd packages/slack
npm publish --access public
cd ../..

# Convex (depends on nothing internal)
echo "📦 Publishing @jonsoc/convex..."
cd packages/convex
npm publish --access public
cd ../..

# Console Resource (no internal deps)
echo "📦 Publishing @jonsoc/console-resource..."
cd packages/console/resource
npm publish --access public
cd ../../..

# UI (depends on SDK and util - but util is private)
echo "📦 Publishing @jonsoc/ui..."
cd packages/ui
npm publish --access public
cd ../..

# App (depends on SDK, UI, util)
echo "📦 Publishing @jonsoc/app..."
cd packages/app
npm publish --access public
cd ../..

# Web (depends on convex, env)
echo "📦 Publishing @jonsoc/web..."
cd packages/web
npm publish --access public
cd ../..

# Console App (depends on console-resource, UI)
echo "📦 Publishing @jonsoc/console-app..."
cd packages/console/app
npm publish --access public
cd ../../..

# Main jonsoc package (depends on SDK, plugin, script, util)
echo "📦 Publishing jonsoc (main package)..."
cd packages/jonsoc
npm publish --access public
cd ../..

echo ""
echo "✅ All packages published successfully!"
