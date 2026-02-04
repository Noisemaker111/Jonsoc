# packages/desktop

## OVERVIEW

Tauri v2 desktop wrapper for the Solid app.

## STRUCTURE

- src: Solid renderer entry
- src-tauri: Rust/Tauri config and bundles
- scripts: local dev helpers

## WHERE TO LOOK

- Edit packages/desktop/src/index.tsx: app entry
- Edit packages/desktop/src-tauri/tauri.conf.json: Tauri config
- Edit packages/desktop/src-tauri/src/main.rs: Tauri main
- Edit packages/desktop/vite.config.ts: Vite config
- Edit packages/desktop/scripts/predev.ts: predev hook

## CONVENTIONS

- Run `bun run --cwd packages/desktop tauri dev` for native shell
- Run `bun run --cwd packages/desktop dev` for web-only dev server

## ANTI-PATTERNS

- Editing generated files under `src-tauri/target`
