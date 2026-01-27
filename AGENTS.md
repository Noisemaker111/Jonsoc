# JonsOC Agent Guidelines

This repository is a fork of JonsOC maintained by **Noisemaker111**. Target: `Noisemaker111/jonsoc` on `dev` branch.

## Build & Test

- Install: `bun install`
- Dev: `bun dev`
- Typecheck: `bun run typecheck`
- Test: `bun test`

## Code Style

- Avoid `any`, use strict types
- Prefer `const` over `let`
- Early returns, avoid `else`
- Single-word variable names where possible

## Core Architecture

### Brand System (`packages/opencode/src/brand/index.ts`)

**Single source of truth for all branding.**

Constants: `CLI_NAME`, `DOMAIN`, `API_URL`, `MODELS_URL`, `CONFIG_FILES`, etc.

All support both `JONSOC_*` and `OPENCODE_*` env var prefixes.

### Provider System (`packages/opencode/src/provider/provider.ts`)

**Manages AI model providers.**

Key: `Provider.list()` returns all providers with models.

**Critical**:

- Neutral providers (openrouter, vercel, etc.) → use `Brand.*` constants
- **Paid services (zenmux/OpenCode Zen)** → hardcode to opencode.ai, DO NOT rebrand

### Config Loading (`packages/opencode/src/config/config.ts`)

**Multi-source config merging.**

Priority: remote → global → custom → project → inline

Uses `Brand.CONFIG_FILES` and `Brand.CONFIG_TARGETS` for file/directory discovery.

`ALLOW_LEGACY_OPENCODE_CONFIGS=true` (default) enables opencode.json/.opencode/ support.

### Models (`packages/opencode/src/provider/models.ts`)

**Fetches/caches model info from `Brand.MODELS_URL`.**

Default: `https://models.dev` (opencode.ai's infrastructure).

### Auth (`packages/opencode/src/auth/index.ts`)

**Credential storage via `Storage` namespace.**

Types: `api`, `oauth`, `wellknown`.

## Key Patterns

### Branding

```typescript
import { Brand } from "../brand"

// Use Brand constants
const url = Brand.API_URL
const name = Brand.CLI_NAME

// For providers, use Brand in headers
options: {
  headers: {
    "HTTP-Referer": `${Brand.DOMAIN_WITH_PROTOCOL}/`,
    "X-Title": Brand.BRAND_LOWER,
  },
}

// EXCEPT: Paid services (zenmux) - hardcode to opencode.ai
```

### Config Discovery

```typescript
// Search paths use Brand constants
const files = Brand.CONFIG_FILES // ["jonsoc.json", "opencode.json", ...]
const targets = Brand.CONFIG_TARGETS // [".opencode", ".jonsoc"]
```

### Don't Rebrand These

- **OpenCode Zen (zenmux)**: opencode.ai's paid service
- Third-party providers (openai, anthropic, google-vertex): External services
- models.dev: opencode.ai's infrastructure (default)

## Important Files

| File                    | Purpose                      |
| ----------------------- | ---------------------------- |
| `brand/index.ts`        | All brand constants          |
| `global/index.ts`       | Paths, cache                 |
| `provider/provider.ts`  | All provider implementations |
| `provider/models.ts`    | Model discovery              |
| `config/config.ts`      | Config loading               |
| `auth/index.ts`         | Credential storage           |
| `installation/index.ts` | Updates, versioning          |
| `cli/cmd/*.ts`          | CLI commands                 |

## VCS

Check `.jj/` dir first → use `jj`, else `git`.

Target: `Noisemaker111/jonsoc` on `dev` branch.

## Quick Reference

**Add brand constant**: Edit `packages/opencode/src/brand/index.ts`

**Add provider**:

1. Add to `Provider.Info` schema in config.ts
2. Implement in `provider/provider.ts`
3. Use `Brand.*` in headers (or hardcode if paid service)

**Test**: `bun run typecheck` before committing

**Fork**: Set `JONSOC_*` env vars for branding, keep models.dev default
