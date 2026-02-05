# packages/jonsoc

## OVERVIEW

Core CLI/server package: providers, tools, server APIs, and build scripts.

## STRUCTURE

- src/cli: command entrypoints and prompts
- src/server: HTTP + websocket server
- src/provider: model providers + registry
- src/config: config loading/merging
- src/brand: branding constants
- src/tool: tool definitions and registry
- src/session: session lifecycle and storage

## WHERE TO LOOK

- Edit packages/jonsoc/src/index.ts: CLI entry
- Edit packages/jonsoc/src/server/server.ts: API routes and handlers
- Edit packages/jonsoc/src/provider/provider.ts: provider list and headers
- Edit packages/jonsoc/src/config/config.ts: config priority + merge
- Edit packages/jonsoc/src/brand/index.ts: brand constants
- Edit packages/jonsoc/src/tool: tool implementations
- Edit packages/jonsoc/script/generate.ts: SDK regeneration

## CONVENTIONS

- Validate inputs with Zod at boundaries
- Tools implement `Tool.Info` with `execute()` and Result-style errors
- Use `Log.create({ service })` and `Storage` namespace for persistence
- When server endpoints change, run `./script/generate.ts` to refresh SDK

## ANTI-PATTERNS

- Throwing exceptions inside tools (use Result errors)
- Editing files under `dist/` or generated SDK outputs
