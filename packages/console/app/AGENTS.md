# packages/console/app

## OVERVIEW

SolidStart console web app for workspace UI, auth, and Zen APIs.

## STRUCTURE

- src/asset: logos and static art
- src/component: shared UI widgets
- src/context: auth/session context
- src/lib: integrations and helpers
- src/routes: file-based pages and APIs
- src/style: tokens and global styles
- public: static assets

## WHERE TO LOOK

- Edit packages/console/app/src/app.tsx: router root and meta
- Edit packages/console/app/src/entry-server.tsx: SSR document shell
- Edit packages/console/app/src/entry-client.tsx: client hydration
- Edit packages/console/app/src/middleware.ts: request middleware
- Edit packages/console/app/src/routes/zen/util/handler.ts: Zen pipeline
- Edit packages/console/app/src/routes/zen/v1/\*.ts: API endpoints
- Edit packages/console/app/src/routes/workspace/[id].tsx: workspace shell
- Edit packages/console/app/src/config.ts: site constants

## CONVENTIONS

- Routes are file-based; pages use .tsx, API handlers use .ts
- Zen endpoints delegate to `handler()` with format parsers
- Design tokens live under `src/style/token`

## ANTI-PATTERNS

- Ad-hoc CSS outside the tokenized style layers
- Bypassing Zen handler utilities in new API routes
