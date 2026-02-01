#!/bin/bash
# Publish all @jonsoc packages locally

set -e

echo "Publishing @jonsoc/util..."
cd packages/util
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/env..."
cd packages/env
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/sdk..."
cd packages/sdk/js
npm publish --access public || echo "Already exists or failed"
cd ../../..

echo "Publishing @jonsoc/script..."
cd packages/script
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/plugin..."
cd packages/plugin
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/slack..."
cd packages/slack
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/convex..."
cd packages/convex
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/ui..."
cd packages/ui
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/app..."
cd packages/app
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/web..."
cd packages/web
npm publish --access public || echo "Already exists or failed"
cd ../..

echo "Publishing @jonsoc/console-resource..."
cd packages/console/resource
npm publish --access public || echo "Already exists or failed"
cd ../../..

echo "Publishing @jonsoc/console-app..."
cd packages/console/app
npm publish --access public || echo "Already exists or failed"
cd ../../..

echo "Done!"
