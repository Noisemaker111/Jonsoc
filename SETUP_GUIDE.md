# OpenCode Attribution & Trusted Publishing Setup

## Summary of Changes

### 1. README.md Updates ✅

- Added prominent attribution to OpenCode in the header
- Added "💐 About This Fork" section explaining the relationship to OpenCode
- Enhanced fork notes with clearer feature differentiation
- Added acknowledgments and support links for the original project

### 2. ATTRIBUTION.md Created ✅

- New file crediting OpenCode as the original project
- Explains why the fork exists
- Lists specific contributions from the OpenCode team
- Provides guidance on supporting the upstream project

### 3. Package.json Updates ✅

- Updated `description` to mention it's a fork of OpenCode
- Added `opencode` and `opencode-fork` keywords
- Added references to the upstream project

### 4. GitHub Actions Workflow ✅

- Added `id-token: write` permission for trusted publishing
- Added `publish-npm` job for automated npm releases
- Workflow triggers on pushes to `master` and version tags
- Includes provenance attestation for supply chain security
- Added release notes template with OpenCode attribution

### 5. Brand Configuration ✅

- Added header comment explaining the fork relationship
- Added `UPSTREAM_NAME`, `UPSTREAM_URL`, and `UPSTREAM_REPO` constants
- Maintains support for both JONSOC*\* and OPENCODE*\* env variables

## Next Steps to Complete Setup

### Step 1: Configure npm Trusted Publishing

You need to set up trusted publishing in your npm account:

1. Go to https://www.npmjs.com/package/jonsoc/access
2. Click "Add automated access" or "Add GitHub Actions as trusted publisher"
3. Configure:
   - **Repository**: `Noisemaker111/Jonsoc`
   - **Workflow name**: `build-release.yml`
   - **Environment** (optional): leave empty or create "release"

For scoped packages (`@jonsoc/*`), do the same at:

- https://www.npmjs.com/settings/jonsoc/packages/access

### Step 2: Add NPM_TOKEN Secret (Fallback)

If trusted publishing doesn't work immediately, you can use a classic token as fallback:

1. Go to https://www.npmjs.com/settings/tokens
2. Create a "Granular access token" with:
   - Read and Write access to packages: `jonsoc` and `@jonsoc/*`
   - Check "Bypass 2FA" for automation
3. Add to GitHub Secrets:
   - Go to https://github.com/Noisemaker111/Jonsoc/settings/secrets/actions
   - Add secret named `NPM_TOKEN`

### Step 3: Test the Workflow

Once configured, you can test by:

```bash
# Option A: Push to master
git add .
git commit -m "Add OpenCode attribution and trusted publishing"
git push origin master

# Option B: Create a version tag
git tag v1.1.44
git push origin v1.1.44
```

The workflow will:

1. Build binaries for Linux, macOS, and Windows
2. Publish to npm with provenance
3. Create a GitHub release with all binaries

### Step 4: Verify Everything Works

After the workflow runs, verify:

1. **npm packages are updated**:
   - https://www.npmjs.com/package/jonsoc
   - https://www.npmjs.com/package/@jonsoc/sdk
   - (etc.)

2. **GitHub release is created**:
   - Check https://github.com/Noisemaker111/Jonsoc/releases

3. **Installation works**:
   ```bash
   bun add -g jonsoc
   jonsoc --version
   jonsoc places
   ```

## Files Modified

1. `README.md` - Added OpenCode attribution
2. `ATTRIBUTION.md` - New file with full credits
3. `packages/jonsoc/package.json` - Updated description and keywords
4. `.github/workflows/build-release.yml` - Added trusted publishing
5. `packages/jonsoc/src/brand/index.ts` - Added upstream references

## License & Compliance

Both projects use the MIT License. Your fork:

- ✅ Maintains the same license
- ✅ Credits the original authors
- ✅ Links to the upstream project
- ✅ Does not claim ownership of the original work

This fulfills all open-source attribution requirements! 💐

## Support the Original Project

Consider:

- ⭐ Starring the OpenCode repository
- 💰 Sponsoring the OpenCode team
- 📣 Sharing both projects with your network
- 🐛 Reporting bugs to the appropriate project
