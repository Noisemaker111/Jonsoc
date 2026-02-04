# packages/app

## OVERVIEW

SolidJS/OpenTUI TUI client for the JonsOC CLI.

## STRUCTURE

- src/pages: route-level views
- src/components: TUI components and composites
- src/context: app-wide state providers
- src/hooks: Solid hooks
- src/utils: DOM, persistence, worktree helpers
- src/i18n: locale dictionaries
- e2e: Playwright specs
- script: dev helpers

## WHERE TO LOOK

- Edit packages/app/src/app.tsx: app root + providers
- Edit packages/app/src/entry.tsx: web bootstrap and platform adapter
- Edit packages/app/src/pages/layout.tsx: shell layout
- Edit packages/app/src/pages/session.tsx: terminal session UI
- Edit packages/app/src/context/platform.tsx: platform contract
- Edit packages/app/src/index.ts: public exports

## CONVENTIONS

- Prefer `createStore` over multiple `createSignal` calls
- Local UI work: run backend `bun run --conditions=browser ./src/index.ts serve --port 4096` in `packages/jonsoc`
- Local UI work: run app `bun dev -- --port 4444` in `packages/app`

## ANTI-PATTERNS

- Restarting app or server during debugging
- Using `jonsoc dev web` for UI changes (proxies prod UI)
