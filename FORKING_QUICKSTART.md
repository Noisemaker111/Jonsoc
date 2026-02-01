# 🎯 Forking Made Easy

JonsOC is now designed to be easily forkable. You can create your own branded version with just a few environment variables or by editing one file.

## Quick Start

### For Most Forks (Recommended)

Just set your branding - keep jonsoc.com's models infrastructure:

```bash
# Your brand (docs, website, install page)
export JONSOC_BRAND="MyBrand"
export JONSOC_DOMAIN="mybrand.com"
export JONSOC_REPO="myorg/my-fork"

# Build
bun install
bun run build
```

That's it! You get:

- ✅ Your own branding (docs at mybrand.com, install page, etc.)
- ✅ **Access to jonsoc.com's hosted models** (including minimax/m2.1)
- ✅ Free model discovery infrastructure
- ✅ No servers to maintain

### Migrating from jonsoc

Good news: **Legacy configs are always enabled.**

If you're switching from jonsoc to jonsoc, you don't need to do anything:

```bash
# Your brand
export JONSOC_BRAND="MyBrand"
export JONSOC_DOMAIN="mybrand.com"

# That's it! Legacy configs work by default
# Your jonsoc.json and .jonsoc/ configs still work!
```

✅ **What this gives you (automatically):**

- Your new branding (mybrand.com)
- Access to all your existing `jonsoc.json` configs
- Access to your `.jonsoc/` directory configs
- Gradual migration - keep using old configs while setting up new ones

⚠️ **Tip**: Legacy configs are always enabled. Gradually create your new `jonsoc.json` configs as needed.

### For Custom Models Infrastructure (Advanced)

If you want to host your own models (advanced):

```bash
# Your brand
export JONSOC_BRAND="MyBrand"
export JONSOC_DOMAIN="mybrand.com"

# Your custom models (you must host this!)
export OPENCODE_MODELS_URL=https://your-models.com
```

⚠️ **Warning**: Hosting your own models infrastructure is complex. You'll need:

- Model registry API
- Proxy services for rate-limited models
- Rate limiting, caching, monitoring
- Regular updates as models change

## Legacy Config File Discovery

**Legacy configs are always enabled.** You don't need to set anything!

When enabled (default):

**Config files searched** (in order):

1. `jonsoc.json` (your new config)
2. `jonsoc.json` (your old config - still works!)
3. `jonsoc.jsonc` (your new config, comments allowed)
4. `jonsoc.jsonc` (your old config, comments allowed)

**Directories searched** (in order):

1. `.jonsoc/` (your new directory)
2. `.jonsoc/` (your old directory - still works!)

This means you can:

- Keep using your existing jonsoc configs immediately
- Gradually migrate to jonsoc configs at your own pace
- Never lose access to your existing settings

**Config priority**: Newer files override older ones. So `jonsoc.json` takes precedence over `jonsoc.json` if both exist.

## What Changed?

**Before**: 100+ hardcoded "jonsoc.com/jonsoc.com" references scattered everywhere

**After**: Single `Brand` namespace with environment variable overrides

### Files Modified

- `packages/jonsoc/src/brand/index.ts` - **NEW** - All brand configuration
- 10+ files updated to use `Brand.*` constants

## Documentation

- **[FORKING.md](./FORKING.md)** - Complete forking guide
- **[.env.example](./.env.example)** - All configurable values
- **[FORKING_SUMMARY.md](./FORKING_SUMMARY.md)** - Technical details

## Example Scenarios

### Scenario 1: Rebrand with jonsoc.com Models (99% of forks)

You want your own brand but don't want to maintain infrastructure:

```bash
export JONSOC_BRAND="CoolAI"
export JONSOC_DOMAIN="coolai.com"
```

✅ Gets you: coolai.com branding + access to minimax/m2.1 + no servers to run

### Scenario 2: Custom Everything (Advanced)

You want full control:

```bash
export JONSOC_BRAND="CoolAI"
export JONSOC_DOMAIN="coolai.com"
export OPENCODE_MODELS_URL=https://models.coolai.com
```

⚠️ Requires: You host models.coolai.com and implement model registry

## Environment Variables

All support both `JONSOC_*` and `OPENCODE_*` prefixes.

| Variable              | What It Controls   | Default                              |
| --------------------- | ------------------ | ------------------------------------ |
| `JONSOC_BRAND`        | Display name       | `jonsoc`                             |
| `JONSOC_DOMAIN`       | Main domain        | `jonsoc.com`                          |
| `JONSOC_API_DOMAIN`   | API subdomain      | `api.jonsoc.com`                      |
| `JONSOC_DOCS_DOMAIN`  | Docs subdomain     | `docs.jonsoc.com`                     |
| `OPENCODE_MODELS_URL` | Models service URL | `https://models.dev` (jonsoc.com's) |
| `JONSOC_REPO`         | GitHub repo        | `Noisemaker111/Jonsoc`               |
| `JONSOC_NPM_PACKAGE`  | NPM package        | `jonsoc`                             |

**Important**: `OPENCODE_MODELS_URL` defaults to `https://models.dev` to give you free access to jonsoc.com's hosted models. Only change this if you want to build your own models infrastructure.

## Why models.dev Stays as Default?

Models like **minimax/m2.1** are hosted by jonsoc.com and require:

- Specific proxy services
- Rate limiting
- Authentication infrastructure

By defaulting to jonsoc.com's models.dev:

- You get free access to these models
- You only need to brand your own docs/site
- No infrastructure maintenance

## Quick Fork Checklist

### New Fork

- [ ] Set `JONSOC_BRAND`
- [ ] Set `JONSOC_DOMAIN`
- [ ] Set `JONSOC_REPO`
- [ ] Test: `bun dev`
- [ ] Update README.md with your brand
- [ ] Update package.json if needed
- [ ] Build: `bun run build`

### Migrating from jonsoc

- [ ] Set `JONSOC_BRAND` (your new brand)
- [ ] Test: `bun dev` (your old configs work automatically!)
- [ ] Create new `jonsoc.json` configs as needed
- [ ] Gradually migrate configs at your own pace
- [ ] Keep `jonsoc.json` configs as long as needed

That's it! 🚀