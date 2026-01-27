# Fork Configuration Changes

## Summary

This document describes changes made to make JonsOC fork-friendly, reducing the number of hardcoded references from 100+ to just a few configurable values in a single file.

## Important Design Decision: Models Infrastructure

**MODELS_URL defaults to `https://models.dev` (opencode.ai's hosted models service)**

This is an intentional design decision because:

1. **Hosted models require specific infrastructure** - Models like minimax/m2.1 are hosted by opencode.ai and require their proxy services
2. **Most forks want branding, not infrastructure** - They want their own docs, website, and branding, not to maintain model discovery infrastructure
3. **Hosting models.dev is complex** - Requires maintaining:
   - Model registry and metadata API
   - Proxy services for rate-limited models
   - Rate limiting and caching
   - Monitoring and uptime
   - Regular updates as new models are released

**Forks get the best of both worlds:**

- ✅ Free models infrastructure (opencode.ai's models.dev)
- ✅ Access to opencode.ai hosted models (minimax/m2.1, etc.)
- ✅ Their own branding (docs, website, install page, domain)

**To use custom models infrastructure**, users MUST explicitly set `OPENCODE_MODELS_URL`:

```bash
export OPENCODE_MODELS_URL=https://your-models-domain.com
```

This makes the intent clear: you're choosing to not use opencode.ai's models infrastructure.

## Problem

The original codebase had over 100 hardcoded references to "jonsoc.ai" and "opencode.ai" scattered across multiple files. This made forking difficult as developers had to:

1. Find and replace strings across many files
2. Track which URLs belonged to which service
3. Ensure all references were updated consistently
4. Risk missing some references

## Solution

Created a centralized `Brand` namespace (`packages/opencode/src/brand/index.ts`) that serves as a single source of truth for all brand-specific configuration.

## New File

### `packages/opencode/src/brand/index.ts` (NEW)

This file contains all configurable brand values:

```typescript
export namespace Brand {
  export const BRAND_NAME = "jonsoc"
  export const DOMAIN = "jonsoc.ai"
  export const API_URL = "https://api.jonsoc.ai"
  export const MODELS_URL = "https://models.dev"  // Defaults to opencode.ai's models.dev
  export const INSTALL_URL = "https://jonsoc.ai/install"
  export const CONFIG_SCHEMA_URL = "https://jonsoc.ai/config.json"
  export const WELL_KNOWN_PATH = "/.well-known/jonsoc"
  export const CONFIG_FILES = ["jonsoc.jsonc", "jonsoc.json", ...]
  // ... and more
}
```

Each value can be overridden via environment variable with both `JONSOC_*` and `OPENCODE_*` prefixes.

**Key Point**: `MODELS_URL` is NOT configurable via domain - it defaults to `https://models.dev` and requires explicit `OPENCODE_MODELS_URL` override to change.

## Modified Files

All hardcoded references replaced with `Brand.*` constants:

1. **`packages/opencode/src/global/index.ts`**
   - Uses `Brand.MODELS_URL` for models API
   - Uses `Brand.APP_NAME` for XDG paths

2. **`packages/opencode/src/config/config.ts`**
   - Uses `Brand.CONFIG_FILES` for config file search
   - Uses `Brand.CONFIG_TARGETS` for directory search
   - Uses `Brand.CONFIG_SCHEMA_URL` for JSON schema validation
   - Uses `Brand.WELL_KNOWN_PATH` for remote config discovery

3. **`packages/opencode/src/installation/index.ts`**
   - Uses `Brand.CLI_NAME` for package naming
   - Uses `Brand.NPM_PACKAGE` for npm operations
   - Uses `Brand.INSTALL_URL` for installation scripts
   - Uses `Brand.USER_AGENT` for API requests
   - Uses `Brand.REPO` for GitHub operations
   - Uses `Brand.HOMEBREW_TAP` for brew installation

4. **`packages/opencode/src/provider/provider.ts`**
   - Uses `Brand.DOMAIN_WITH_PROTOCOL` for HTTP headers
   - Uses `Brand.BRAND_LOWER` for user agent headers
   - Applied to: openrouter, vercel, zenmux, cloudflare-ai-gateway, cerebras

5. **`packages/opencode/src/cli/cmd/github.ts`**
   - Uses `Brand.API_URL` for GitHub app installation
   - Uses `Brand.DOMAIN_WITH_PROTOCOL` for share URLs
   - Uses `Brand.DOCS_URL` for documentation links

6. **`packages/opencode/src/cli/cmd/auth.ts`**
   - Uses `Brand.DOCS_URL` for authentication help
   - Updated opencode and cloudflare provider auth messages

7. **`packages/opencode/src/cli/cmd/import.ts`**
   - Uses `Brand.DOMAIN` for help text

8. **`packages/opencode/src/mcp/oauth-provider.ts`**
   - Uses `Brand.BRAND_NAME` for OAuth client name
   - Uses `Brand.DOMAIN_WITH_PROTOCOL` for OAuth client URI

9. **`packages/opencode/src/share/share.ts`**
   - Uses `Brand.API_URL` for share sync endpoint

10. **`packages/opencode/src/index.ts`**
    - Uses `Brand.CLI_NAME` for CLI script name
    - Uses `Brand.BRAND_LOWER` for logging

11. **`packages/opencode/src/server/server.ts`**
    - Uses Brand.DOMAIN for app host
    - Uses Brand.CLI_NAME for auth username
    - Updated CORS domain logic

## How to Fork Now

### Method 1: Environment Variables (Easiest)

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

Then build and run normally. All URLs and branding will use these values.

### Method 2: Edit Brand File

For permanent changes, edit `packages/opencode/src/brand/index.ts` and modify the default values. This is recommended for production forks.

## Backward Compatibility

The solution maintains full backward compatibility:

1. **Dual environment variable prefixes**: Both `JONSOC_*` and `OPENCODE_*` are supported
2. **Legacy directory names**: Still checks for `.opencode/` and `opencode.json` files when brand is "jonsoc"
3. **Legacy provider support**: Original "opencode" provider still works
4. **Graceful fallback**: If env vars not set, uses sensible defaults

## Testing

All changes have been typechecked successfully:

```bash
$ bun run typecheck
# 4 successful, 4 total
```

## Documentation

Three new documentation files created:

1. **`FORKING.md`** - Complete guide for forking
2. **`.env.example`** - Template showing all configurable values
3. **`FORKING_SUMMARY.md`** - This file

## Impact

### Before

- ~100+ hardcoded references across codebase
- Manual find/replace required for each fork
- High risk of missing references
- Difficult to track what changed
- No clear separation between branding and infrastructure

### After

- Single source of truth in one file
- Environment variable or one-file edit to rebrand entire application
- Type-safe (all constants are typed)
- Easy to audit and maintain
- Backward compatible with existing installs
- **Clear separation: branding = yours, models = opencode.ai's (optional override)**

## Environment Variables Reference

Complete list in `.env.example`:

| Variable               | Description              | Default                              |
| ---------------------- | ------------------------ | ------------------------------------ |
| `JONSOC_BRAND`         | Brand name (display)     | `jonsoc`                             |
| `JONSOC_DOMAIN`        | Main domain              | `jonsoc.ai`                          |
| `JONSOC_API_DOMAIN`    | API subdomain            | `api.jonsoc.ai`                      |
| `JONSOC_DOCS_DOMAIN`   | Docs subdomain           | `docs.jonsoc.ai`                     |
| `OPENCODE_MODELS_URL`  | **Full models API URL**  | `https://models.dev` (opencode.ai's) |
| `JONSOC_INSTALL_URL`   | Installation script URL  | `https://jonsoc.ai/install`          |
| `JONSOC_CONFIG_SCHEMA` | JSON Schema URL          | `https://jonsoc.ai/config.json`      |
| `JONSOC_REPO`          | GitHub repo (owner/repo) | `Noisemaker111/Jonsoc`               |
| `JONSOC_APP_NAME`      | App name for paths       | `jonsoc`                             |
| `JONSOC_NPM_PACKAGE`   | NPM package name         | `jonsoc-ai`                          |
| `JONSOC_HOMEBREW_TAP`  | Homebrew tap             | `sst/homebrew-tap`                   |
| `JONSOC_CLI_NAME`      | CLI command name         | `jonsoc`                             |

**Note on Models**: `OPENCODE_MODELS_URL` is intentionally NOT configured by domain. This makes it clear when someone wants to use custom models infrastructure. The default uses opencode.ai's models.dev, providing access to hosted models like minimax/m2.1.

## Next Steps for Maintainers

1. Review the `Brand` namespace and ensure all defaults are correct for JonsOC
2. Set up your production infrastructure (docs site, API endpoints)
3. Update `.env.example` with production values
4. Update `FORKING.md` with any brand-specific instructions
5. Consider adding integration tests that verify Brand constants are used throughout

## Files Intentionally Not Changed

The following retain hardcoded values and are NOT configurable:

- Test fixtures and test files - Test isolation
- Third-party provider URLs (github.com, gitlab.com, openai.com) - External services
- Third-party documentation links - External resources
- Package names of third-party SDKs - External dependencies

These are intentional as they reference services outside of the fork's control.

## Example Scenarios

### Scenario 1: Rebrand with opencode.ai Models (Most Common)

```bash
export JONSOC_BRAND="MyBrand"
export JONSOC_DOMAIN="mybrand.com"

# Result:
# - Your own docs, website, install at mybrand.com
# - Still get minimax/m2.1 and other opencode.ai hosted models
# - No infrastructure maintenance needed
```

### Scenario 2: Fork with Custom Models (Advanced Users)

```bash
export JONSOC_BRAND="MyBrand"
export JONSOC_DOMAIN="mybrand.com"
export OPENCODE_MODELS_URL=https://models.mycompany.com

# Result:
# - Your own docs, website, install
# - Your own models infrastructure (you must host this)
# - No access to opencode.ai hosted models unless you add them manually
```

The first scenario is what 99% of forks will want. The second is available for advanced users who want full infrastructure control.
