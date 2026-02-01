# Publishing jonsOC to npm

This guide explains how to publish jonsOC as a global npm package that users can install with `bun add -g jonsoc` or `npm install -g jonsoc`.

## Changes Made

1. **Removed `"private": true`** from `package.json` to allow publishing
2. **Updated package name** in publish script from "jonsoc" to "jonsoc"
3. **Added npm metadata** (description, keywords, repository, etc.) for better discoverability
4. **Updated README** with installation and usage instructions

## How It Works

jonsOC uses a multi-package distribution strategy (similar to esbuild, Parcel, etc.):

1. **Main package (`jonsoc`)**: Contains the wrapper script that users install
2. **Platform-specific packages**: Compiled binaries for each platform:
   - `jonsoc-linux-x64`
   - `jonsoc-darwin-arm64`
   - `jonsoc-windows-x64`

When users install `jonsoc`, npm automatically installs the correct platform-specific binary as an optional dependency.

## Prerequisites

Before publishing, make sure you:

1. **Have an npm account**: Sign up at https://www.npmjs.com
2. **Are logged in to npm**:
   ```bash
   npm login
   ```
3. **Check package name availability**:
   ```bash
   npm view jonsoc
   ```
   If the package exists and isn't yours, you'll need to choose a different name.

## Publishing Steps

### 1. Build all platform binaries

```bash
cd packages/jonsoc
bun run build
```

This creates compiled binaries for all supported platforms in the `dist/` directory.

### 2. Test locally (optional but recommended)

Build for your current platform only:

```bash
bun run build -- --single
```

Test the binary:

```bash
./dist/jonsoc-<your-platform>-<your-arch>/bin/jonsoc --version
```

### 3. Publish to npm

```bash
bun run script/publish.ts
```

This will:

- Publish all platform-specific packages
- Publish the main `jonsoc` package
- Create GitHub release archives (if configured)

### 4. Test the published package

```bash
# In a different directory
bun add -g jonsoc

# Verify installation
jonsoc --version
jonsoc --help
```

## Version Management

The version is managed in `@jonsoc/script` package. To publish a new version:

1. Update the version in the script package
2. Run the build and publish commands

## Troubleshooting

### Package name already taken

If `jonsoc` is already taken on npm, you have a few options:

1. **Use a scoped package**: Change to `@your-username/jonsoc`
2. **Choose a different name**: e.g., `jonsoc-cli`, `jonsoc-dev`, etc.
3. **Contact the current owner** if the package is abandoned

To use a scoped package, update the `name` field in `package.json`:

```json
{
  "name": "@your-username/jonsoc"
}
```

### Authentication errors

If you get authentication errors:

```bash
npm whoami  # Check if logged in
npm login   # Login if needed
```

### Platform binary issues

If a specific platform binary fails to build:

```bash
# Build only current platform for testing
bun run build -- --single

# Skip npm install during build
bun run build -- --skip-install
```

## Publishing Updates

When publishing updates:

1. Update version in script package
2. Run `bun run build`
3. Run `bun run script/publish.ts`

The publish script automatically:

- Tags releases based on the channel (stable, preview, etc.)
- Creates platform-specific packages
- Updates the main package

## Notes

- The publish script uses `--access public` to ensure packages are publicly available
- Platform-specific binaries are automatically selected during installation based on OS and architecture
- The bin wrapper (`bin/jonsoc`) handles finding and executing the correct binary
