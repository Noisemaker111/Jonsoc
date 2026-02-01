# JonsOC Agent Guidelines

This repository is a fork of JonsOC maintained by **Noisemaker111**. Target: `Noisemaker111/jonsoc` on `dev` branch.

## Project Context

**JonsOC** is a VSCode-like editor being built on top of an JonsOC fork. It includes a custom TUI (Terminal User Interface) built with OpenTUI and SolidJS. The project aims to provide an integrated development environment with AI assistance.

## Question Policy

**When you need to ask the user any question, always use the question tool. Do not ask questions in plain text.**

- Provide at most 3 options in the question tool
- The UI automatically adds option D as "Type your own answer"
- Use this for yes/no questions, choices, and any clarification
- Never ask questions in prose without using the tool

## File References please can i edit this

**When referencing files, prefix with a context keyword to make them clickable:**

Keywords: `Edit`, `File`, `at`, `in`, `see`, `check`, `open`, `view`, `read`

**Good (clickable):**

- Edit packages/jonsoc/src/cli/ui.ts
- File: packages/jonsoc/src/cli/ui.ts:81
- Check packages/jonsoc/src/cli/ui.ts

**Bad (not clickable):**

- packages/jonsoc/src/cli/ui.ts
- Look at packages/jonsoc/src/cli/ui.ts
- The file is packages/jonsoc/src/cli/ui.ts

**Note:** Paths with `/` or `\` separators work. Line numbers are captured after colon.

## Build & Test

- Install: `bun install`
- Dev: `bun dev`
- Typecheck: `bun run typecheck`
- Test: `bun test`

**CI/CD**: Pushing to `master` triggers GitHub Actions to build binaries and publish all packages to npm automatically.

## Code Style

- Avoid `any`, use strict types
- Prefer `const` over `let`
- Early returns, avoid `else`
- Single-word variable names where possible

## Core Architecture

### Brand System (`packages/jonsoc/src/brand/index.ts`)

**Single source of truth for all branding.**

Constants: `CLI_NAME`, `DOMAIN`, `API_URL`, `MODELS_URL`, `CONFIG_FILES`, etc.

All support both `JONSOC_*` and `OPENCODE_*` env var prefixes.

### Provider System (`packages/jonsoc/src/provider/provider.ts`)

**Manages AI model providers.**

Key: `Provider.list()` returns all providers with models.

**Critical**:

- Neutral providers (openrouter, vercel, etc.) → use `Brand.*` constants
- **Paid services (zenmux/JonsOC Zen)** → hardcode to opencode.ai, DO NOT rebrand

### Config Loading (`packages/jonsoc/src/config/config.ts`)

**Multi-source config merging.**

Priority: remote → global → custom → project → inline

Uses `Brand.CONFIG_FILES` and `Brand.CONFIG_TARGETS` for file/directory discovery.

Legacy jonsoc config support is always enabled (jonsoc.json/.jonsoc/).

### Models (`packages/jonsoc/src/provider/models.ts`)

**Fetches/caches model info from `Brand.MODELS_URL`.**

Default: `https://models.dev` (jonsoc.com's infrastructure).

### Auth (`packages/jonsoc/src/auth/index.ts`)

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
const files = Brand.CONFIG_FILES // ["jonsoc.json", "jonsoc.json", ...]
const targets = Brand.CONFIG_TARGETS // [".jonsoc", ".jonsoc"]
```

### Don't Rebrand These

- **OpenCode Zen (zenmux)**: opencode.ai's paid service
- Third-party providers (openai, anthropic, google-vertex): External services
- models.dev: opencode.ai's infrastructure (default)

### OpenTUI Scrollbox Pattern

**When scrollbox doesn't scroll (mouse or keyboard), check these 3 things:**

```typescript
// 1. Parent MUST have explicit height
<box height="100%">
  <scrollbox
    flexGrow={1}
    height="100%"  // 2. Scrollbox needs height too
    viewportOptions={{
      paddingLeft: 1,
      paddingRight: showScrollbar() ? 2 : 1,
    }}
    verticalScrollbarOptions={{
      paddingLeft: 1,
      visible: showScrollbar(),
      trackOptions: {
        backgroundColor: theme.backgroundElement,
        foregroundColor: theme.border,
      },
    }}
    scrollAcceleration={new CustomSpeedScroll(3)}  // 3. Required for mouse wheel
  >
    {content}
  </scrollbox>
</box>
```

**Debugging approach:**

1. Find a working scrollbox (e.g., chat area in `session/index.tsx`)
2. Compare props line-by-line with broken scrollbox
3. Apply differences systematically

**Common mistakes:**

- Missing `height="100%"` on scrollbox or parent
- Using `paddingLeft`/`paddingRight` directly on scrollbox (move to `viewportOptions`)
- Missing `scrollAcceleration` (needed for mouse wheel events)

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

**Add brand constant**: Edit `packages/jonsoc/src/brand/index.ts`

**Add provider**:

1. Add to `Provider.Info` schema in config.ts
2. Implement in `provider/provider.ts`
3. Use `Brand.*` in headers (or hardcode if paid service)

**Test**: `bun run typecheck` before committing

**Fork**: Set `JONSOC_*` env vars for branding, keep models.dev default
