# packages/web

## OVERVIEW

React web client with TanStack Router, auth, and Tailwind UI.

## STRUCTURE

- src/routes: file-based routes
- src/components: page UI and layout components
- src/components/ui: shared UI atoms
- src/lib: auth/client helpers
- src/main.tsx: app bootstrap

## WHERE TO LOOK

- Edit packages/web/src/main.tsx: app bootstrap
- Edit packages/web/src/routes/\_\_root.tsx: router root + providers
- Edit packages/web/src/routes/index.tsx: landing route
- Edit packages/web/src/routes/dashboard.tsx: authenticated dashboard
- Edit packages/web/src/components: page-level components
- Edit packages/web/src/lib/auth-client.ts: auth client wiring
- Edit packages/web/src/routeTree.gen.ts: generated router tree

## CONVENTIONS

- TanStack Router uses generated `routeTree.gen.ts` from file routes
- UI primitives live under `src/components/ui`

## ANTI-PATTERNS

- Editing `routeTree.gen.ts` by hand
