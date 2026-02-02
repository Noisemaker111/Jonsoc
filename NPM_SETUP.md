# NPM Trusted Publishing Setup Checklist

## Problem

The CI is failing because scoped packages `@jonsoc/*` don't exist on npm yet.
Scoped packages must be created manually before CI can publish them.

## Solution

Create each package on npmjs.com and configure trusted publishing.

## Quick Links (Click each to open)

1. [@jonsoc/util](https://www.npmjs.com/package/@jonsoc/util)
2. [@jonsoc/env](https://www.npmjs.com/package/@jonsoc/env)
3. [@jonsoc/sdk](https://www.npmjs.com/package/@jonsoc/sdk)
4. [@jonsoc/script](https://www.npmjs.com/package/@jonsoc/script)
5. [@jonsoc/plugin](https://www.npmjs.com/package/@jonsoc/plugin)
6. [@jonsoc/slack](https://www.npmjs.com/package/@jonsoc/slack)
7. [@jonsoc/convex](https://www.npmjs.com/package/@jonsoc/convex)
8. [@jonsoc/ui](https://www.npmjs.com/package/@jonsoc/ui)
9. [@jonsoc/app](https://www.npmjs.com/package/@jonsoc/app)
10. [@jonsoc/web](https://www.npmjs.com/package/@jonsoc/web)
11. [@jonsoc/console-resource](https://www.npmjs.com/package/@jonsoc/console-resource)
12. [@jonsoc/console-app](https://www.npmjs.com/package/@jonsoc/console-app)

## Steps for Each Package

For each link above that shows "404 Not Found":

1. **Create the package:**
   - Go to https://www.npmjs.com/
   - Click your profile → "Add Package" → "Create a new package"
   - Package name: (e.g., `@jonsoc/util`)
   - Visibility: **Public**
   - Click "Create Package"

2. **Configure Trusted Publishing:**
   - On the package page, click "Settings" tab
   - Scroll to "Publishing" section
   - Find "Trusted Publishers"
   - Click "Add GitHub Actions as trusted publisher"
   - Repository: `Noisemaker111/Jonsoc`
   - Workflow: `build-release.yml`
   - Click "Save"

3. **Verify:**
   - You should see "Noisemaker111/jonsoc" listed under Trusted Publishers

## After Setup

Once all packages are created and trusted publishing is configured:

1. Go to https://github.com/Noisemaker111/Jonsoc/actions
2. Find the failed workflow run
3. Click "Re-run failed jobs"
4. CI will now publish all packages automatically

## Future Updates

After this initial setup, you never need to do this again. The CI will:

- Auto-bump versions
- Build binaries
- Publish to npm (using trusted publishing)
- Create GitHub releases

All automatically on every push to master!
