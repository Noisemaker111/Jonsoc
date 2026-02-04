# packages/convex

## OVERVIEW

Convex backend package with auth, schema, and HTTP actions.

## STRUCTURE

- convex/\_generated: generated API bindings
- convex/schema.ts: data model
- convex/http.ts: HTTP actions
- convex/auth.ts: auth helpers
- convex/healthCheck.ts: health endpoint

## WHERE TO LOOK

- Edit packages/convex/convex/schema.ts: database schema
- Edit packages/convex/convex/http.ts: HTTP actions
- Edit packages/convex/convex/auth.ts: auth logic
- Edit packages/convex/convex/convex.config.ts: Convex config
- Edit packages/convex/convex/\_generated/api.js: generated API entry

## CONVENTIONS

- Run `convex dev` to regenerate `_generated` bindings after schema changes

## ANTI-PATTERNS

- Manual edits inside `convex/_generated`
