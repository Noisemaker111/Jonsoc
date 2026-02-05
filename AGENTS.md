# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-04
**Commit:** 0e03500d6

## OVERVIEW

JonsOC is a Bun + TypeScript monorepo for an AI coding agent, with a SolidJS/OpenTUI TUI client, a CLI/server core, and multiple web/desktop clients.

## STRUCTURE

```
jonsoc/
|-- packages/   # core CLI, TUI app, shared libraries, web clients
|-- sdks/       # integrations (VS Code)
|-- infra/      # SST infrastructure
|-- script/     # publish/release helpers
|-- scripts/    # repo automation
|-- .github/    # CI workflows
|-- docs/       # docs and guides
`-- specs/      # PRDs and plans
```

## WHERE TO LOOK

| Task               | Location                                      | Notes                                           |
| ------------------ | --------------------------------------------- | ----------------------------------------------- |
| CLI/server entry   | Edit packages/jonsoc/src/index.ts             | Bun CLI + server bootstrap                      |
| Branding constants | Edit packages/jonsoc/src/brand/index.ts       | Single source of truth                          |
| Provider registry  | Edit packages/jonsoc/src/provider/provider.ts | Provider list + headers                         |
| Config merge       | Edit packages/jonsoc/src/config/config.ts     | remote -> global -> custom -> project -> inline |
| TUI app shell      | Edit packages/app/src/app.tsx                 | Solid/OpenTUI UI root                           |
| Shared UI          | Edit packages/ui/src/components               | Solid UI primitives                             |
| Web client         | Edit packages/web/src/routes                  | React app routes                                |
| Console app        | Edit packages/console/app/src/app.tsx         | SolidStart console UI                           |
| JS SDK             | Edit packages/sdk/js/src/v2/index.ts          | SDK entrypoints                                 |
| VS Code extension  | Edit sdks/vscode/src/extension.ts             | VS Code integration                             |

## CONVENTIONS

- No `any`, no non-null assertions, no type assertions
- Prefer `const`, early returns, single-word variable names
- Check for `.jj/` before VCS commands; use `jj` if present
- Do not manually bump package versions; CI handles versioning

## ANTI-PATTERNS (THIS PROJECT)

- Rebranding paid Zen services (zenmux) away from opencode.ai
- Running `bun test` from repo root (script intentionally fails)
- Editing generated artifacts in `dist/` or `*_generated` folders

## UNIQUE STYLES

- Branding via `Brand.*` constants in `packages/jonsoc/src/brand`
- Config discovery and merge order in `packages/jonsoc/src/config`
- OpenTUI scrollbox requires explicit heights + `scrollAcceleration`

## COMMANDS

```bash
# Development
bun dev
bun run dev:web

# Testing
bun run --cwd packages/jonsoc test
bun run --cwd packages/app test

# Build
bun run --cwd packages/jonsoc build
```

## NOTES

- Dev PRs target `dev`; release automation runs on `master`
- `scripts/prepare-for-publish.ts` syncs workspace versions during release
