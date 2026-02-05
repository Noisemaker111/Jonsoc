# packages/jonsoc

## OVERVIEW

Core CLI/server package: providers, tools, server APIs, build scripts.

## STRUCTURE

- src/cli: entrypoints + prompts
- src/server: HTTP + websocket server
- src/provider: model providers + registry
- src/config: config loading/merging
- src/brand: brand constants
- src/tool: tools + registry
- src/session: session lifecycle + storage

## WHERE TO LOOK

- packages/jonsoc/src/index.ts: CLI entry
- packages/jonsoc/src/server/server.ts: API routes
- packages/jonsoc/src/provider/provider.ts: providers + headers
- packages/jonsoc/src/config/config.ts: config priority/merge
- packages/jonsoc/src/brand/index.ts: brand constants
- packages/jonsoc/src/tool: tool implementations
- packages/jonsoc/script/generate.ts: SDK regeneration

## CONVENTIONS

- Validate inputs with Zod at boundaries
- Tools implement `Tool.Info` with `execute()` and Result-style errors
- Use `Log.create({ service })` and `Storage` for persistence
- When server endpoints change, run `./script/generate.ts`

## ANTI-PATTERNS

- Throwing exceptions inside tools
- Editing `dist/` or generated SDK outputs
