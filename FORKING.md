# Forking Guide

## Centralized Brand Configuration

JonsOC now uses a centralized `Brand` namespace that makes forking much easier. All brand-specific configuration is now in `packages/opencode/src/brand/index.ts`.

## Important: Models Infrastructure

**MODELS_URL defaults to `https://models.dev` (opencode.ai's hosted models service)**

This is intentional because:

1. **Models like minimax/m2.1 are hosted by opencode.ai** - These require their infrastructure and proxy services
2. **Most forks want their own branding but still use opencode.ai's model discovery** - You get your own docs, website, and branding
3. **Hosting your own models.dev is complex** - Requires maintaining model registries, proxy servers, rate limiting, etc.

**To use your own models infrastructure**, you MUST explicitly set `OPENCODE_MODELS_URL`:

```bash
export OPENCODE_MODELS_URL=https://your-models-domain.com
```

If you don't set this, the fork will automatically use opencode.ai's `models.dev` for model discovery and any hosted models like minimax/m2.1.

## How to Fork

To fork JonsOC and create your own branded version:

**Option 1: Environment Variables (Recommended)**

Set these environment variables before building/running:

```bash
# Your branding (docs, website, install page)
export JONSOC_BRAND="mybrand"
export JONSOC_DOMAIN="mybrand.com"
export JONSOC_API_DOMAIN="api.mybrand.com"
export JONSOC_DOCS_DOMAIN="docs.mybrand.com"
export JONSOC_REPO="myorg/myfork"

# Models: Leave UNSET to use opencode.ai's models.dev (includes minimax/m2.1)
# Set this ONLY if you have your own models infrastructure
# export OPENCODE_MODELS_URL=https://your-models.com
```

**Option 2: Edit `packages/opencode/src/brand/index.ts`**

Modify the default values in the `Brand` namespace. This is a source of truth for all branding:

```typescript
export namespace Brand {
  export const BRAND_NAME = "mybrand"
  export const DOMAIN = "mybrand.com"
  export const API_URL = "https://api.mybrand.com"
  // MODELS_URL intentionally defaults to https://models.dev
  // Uncomment to use your own models infrastructure:
  // export const MODELS_URL = "https://your-models.com"
  export const REPO = "myorg/myfork"
  // ... and more
}
```

## What You Get With Each Approach

### Use opencode.ai's models.dev (DEFAULT, RECOMMENDED)

✅ Free model discovery infrastructure
✅ Access to opencode.ai hosted models (minimax/m2.1, etc.)
✅ Proxy services for rate-limited models
✅ No infrastructure maintenance needed
✅ Just your own branding (docs, website, install page)

### Use your own models infrastructure

❌ Must host and maintain models.dev equivalent
❌ Must implement proxy services for models like minimax/m2.1
❌ Responsible for rate limiting, caching, monitoring
❌ No access to opencode.ai hosted models unless you build the integration
✅ Full control over all infrastructure

## Available Configuration Options

All configuration options support both `JONSOC_*` and `OPENCODE_*` environment variable prefixes for backward compatibility.

| Option                 | Description                    | Default                              |
| ---------------------- | ------------------------------ | ------------------------------------ |
| `JONSOC_BRAND`         | Brand name (display name)      | `jonsoc`                             |
| `JONSOC_DOMAIN`        | Main domain (without protocol) | `jonsoc.ai`                          |
| `JONSOC_API_DOMAIN`    | API subdomain                  | `api.jonsoc.ai`                      |
| `JONSOC_DOCS_DOMAIN`   | Documentation subdomain        | `docs.jonsoc.ai`                     |
| `OPENCODE_MODELS_URL`  | **Full models API URL**        | `https://models.dev` (opencode.ai's) |
| `JONSOC_INSTALL_URL`   | Installation script URL        | `https://jonsoc.ai/install`          |
| `JONSOC_CONFIG_SCHEMA` | JSON Schema URL for validation | `https://jonsoc.ai/config.json`      |
| `JONSOC_REPO`          | GitHub repo (owner/repo)       | `Noisemaker111/Jonsoc`               |
| `JONSOC_APP_NAME`      | App name for XDG paths         | `jonsoc`                             |
| `JONSOC_NPM_PACKAGE`   | NPM package name               | `jonsoc`                             |
| `JONSOC_HOMEBREW_TAP`  | Homebrew tap for installation  | `sst/homebrew-tap`                   |

## Legacy Compatibility

JonsOC maintains backward compatibility with original opencode.ai fork by:

1. Supporting both `JONSOC_*` and `OPENCODE_*` environment variable prefixes
2. Checking for both `.jonsoc/` and `.opencode/` directories
3. Loading both `jonsoc.json` and `opencode.json` config files
4. Recognizing both brand names in model preferences

Legacy opencode config support is always enabled; there is no toggle.

## What Changed

The following files were modified to use centralized `Brand` namespace:

- `packages/opencode/src/brand/index.ts` - **NEW** - Centralized brand configuration
- `packages/opencode/src/global/index.ts` - Uses `Brand.MODELS_URL`
- `packages/opencode/src/config/config.ts` - Uses `Brand.CONFIG_*` constants
- `packages/opencode/src/installation/index.ts` - Uses `Brand.*` constants
- `packages/opencode/src/provider/provider.ts` - Uses `Brand.DOMAIN_WITH_PROTOCOL` in headers
- `packages/opencode/src/cli/cmd/github.ts` - Uses `Brand.API_URL`
- `packages/opencode/src/share/share.ts` - Uses `Brand.API_URL`
- `packages/opencode/src/index.ts` - Uses `Brand.CLI_NAME` and `Brand.BRAND_LOWER`

### Files Not Changed (Intentionally)

The following files intentionally retain hardcoded values:

- Test files - Maintain test isolation and reproducibility
- Third-party provider URLs (e.g., `gitlab.com`, `github.com`, `openai.com`) - These are external services
- Documentation URLs (e.g., `github.com/oven-sh/bun/issues`) - These are fixed references

## Next Steps

After setting up your brand configuration:

1. **Test your changes**: Run `bun dev` to test locally
2. **Update documentation**: Modify README.md, CONTRIBUTING.md, and other docs
3. **Update package metadata**: Edit `package.json` files to reflect your brand
4. **Configure your services**: Set up your documentation site and API endpoints
5. **Build and distribute**: Use `bun run build` and publish to your preferred registry

## Example: Complete Fork Setup (Using opencode.ai's models)

Here's a complete example for a hypothetical "MyAI" brand:

```bash
# Environment variables - just change branding, keep models.dev!
export JONSOC_BRAND="MyAI"
export JONSOC_DOMAIN="myai.com"
export JONSOC_API_DOMAIN="api.myai.com"
export JONSOC_DOCS_DOMAIN="docs.myai.com"
export JONSOC_REPO="myorg/myai-fork"
export JONSOC_NPM_PACKAGE="myai-cli"

# NOTE: NOT setting OPENCODE_MODELS_URL - will use models.dev (opencode.ai)
# This gives us access to minimax/m2.1 and other opencode.ai hosted models

# Build
bun install
bun run build

# Test
bun dev

# Run
./packages/opencode/dist/bin/myai
```

## Example: Fork With Custom Models Infrastructure

```bash
# Branding
export JONSOC_BRAND="MyAI"
export JONSOC_DOMAIN="myai.com"
export JONSOC_REPO="myorg/myai-fork"

# Custom models - you must host this yourself!
export OPENCODE_MODELS_URL=https://models.myai.com

# Build
bun install
bun run build
```

That's it! Everything else uses these variables automatically.