# packages/util

## OVERVIEW

Small, shared TypeScript utilities used across packages.

## STRUCTURE

- src/\*.ts: focused helpers (path, retry, error, slug, binary)

## WHERE TO LOOK

- Edit packages/util/src/path.ts: path utilities
- Edit packages/util/src/retry.ts: retry helpers
- Edit packages/util/src/error.ts: error utilities
- Edit packages/util/src/identifier.ts: id helpers
- Edit packages/util/src/binary.ts: binary helpers
- Edit packages/util/src/slug.ts: slug creation

## CONVENTIONS

- Keep modules side-effect free and narrowly scoped

## ANTI-PATTERNS

- Adding cross-package dependencies from util back into app packages
