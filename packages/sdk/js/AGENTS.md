# packages/sdk/js

## OVERVIEW

TypeScript SDK for JonsOC APIs with generated v2 clients.

## STRUCTURE

- src/index.ts: public entry
- src/client.ts / src/server.ts: base clients
- src/v2: v2 client surface
- src/v2/gen: generated API client and types
- script/build.ts: build pipeline

## WHERE TO LOOK

- Edit packages/sdk/js/src/index.ts: root exports
- Edit packages/sdk/js/src/v2/index.ts: v2 exports
- Edit packages/sdk/js/src/v2/client.ts: v2 client wrapper
- Edit packages/sdk/js/src/v2/gen: generated API surface
- Edit packages/sdk/js/script/build.ts: build to dist

## CONVENTIONS

- Treat `src/v2/gen` as generated; update via build/generate pipeline

## ANTI-PATTERNS

- Manual edits inside `src/v2/gen` or `dist`
