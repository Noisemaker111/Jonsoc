# Complete Migration: jonsoc-front-and-back → jonsoc Monorepo

## Overview

Migrate EVERYTHING from `jonsoc-front-and-back/` into the main jonsoc monorepo, including all supporting configuration, shared packages, environment setup, and tooling - not just the main app and backend.

## Complete File Inventory

### Must Migrate - Core Application

| Source                      | Target                          | Description            |
| --------------------------- | ------------------------------- | ---------------------- |
| `apps/web/src/routes/*`     | `packages/web/src/routes/*`     | TanStack Router routes |
| `apps/web/src/components/*` | `packages/web/src/components/*` | UI components          |
| `apps/web/src/lib/*`        | `packages/web/src/lib/*`        | Utilities              |
| `apps/web/src/main.tsx`     | `packages/web/src/main.tsx`     | Entry point            |
| `apps/web/src/index.css`    | `packages/web/src/index.css`    | Tailwind v4 styles     |
| `packages/backend/convex/*` | `packages/convex/convex/*`      | Convex backend         |

### Must Migrate - Configuration & Tooling

| Source                               | Target                                 | Description                |
| ------------------------------------ | -------------------------------------- | -------------------------- |
| `turbo.json`                         | Merge into root `turbo.json`           | Turborepo task definitions |
| `packages/config/tsconfig.base.json` | `packages/config/tsconfig.base.json`   | Shared TS config           |
| `packages/env/`                      | `packages/env/` or merge into existing | Environment validation     |
| `apps/web/components.json`           | `packages/web/components.json`         | shadcn/ui config           |
| `apps/web/vite.config.ts`            | `packages/web/vite.config.ts`          | Vite + TanStack Router     |
| `apps/web/tsconfig.json`             | `packages/web/tsconfig.json`           | Web-specific TS config     |
| `apps/web/.env`                      | `packages/web/.env.example`            | Environment template       |
| `packages/backend/.env.local`        | `packages/convex/.env.local`           | Convex env vars            |
| `.gitignore`                         | Merge into root `.gitignore`           | Git ignore patterns        |

### Must Migrate - Dependencies

| Source                      | Target                  | Description                 |
| --------------------------- | ----------------------- | --------------------------- |
| Root `package.json` catalog | Merge into root catalog | Shared dependency versions  |
| `@t3-oss/env-core`          | Add to root catalog     | Environment validation      |
| `@tanstack/router-plugin`   | Add to root catalog     | TanStack Router Vite plugin |
| `@convex-dev/better-auth`   | Add to root catalog     | Convex auth integration     |

## Detailed Migration Plan

### Phase 1: Infrastructure Setup (Days 1-5)

#### 1.1 Create Supporting Packages

**packages/config/** - Shared TypeScript configuration:

```bash
mkdir -p packages/config
cp jonsoc-front-and-back/packages/config/tsconfig.base.json packages/config/
```

Create `packages/config/package.json`:

```json
{
  "name": "@jonsoc/config",
  "version": "1.0.0",
  "private": true,
  "exports": {
    "./tsconfig.base.json": "./tsconfig.base.json"
  }
}
```

**packages/env/** - Environment validation:

```bash
mkdir -p packages/env/src
cp jonsoc-front-and-back/packages/env/src/web.ts packages/env/src/
```

Create `packages/env/package.json`:

```json
{
  "name": "@jonsoc/env",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./web": "./src/web.ts"
  },
  "dependencies": {
    "@t3-oss/env-core": "^0.13.1",
    "dotenv": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@jonsoc/config": "workspace:*",
    "typescript": "catalog:"
  }
}
```

#### 1.2 Update Root Configuration

**Update root `package.json`:**

Add to `workspaces.catalog`:

```json
{
  "catalog": {
    "@t3-oss/env-core": "^0.13.1",
    "@tanstack/router-plugin": "^1.141.1",
    "@tanstack/react-router-devtools": "^1.141.1",
    "@convex-dev/better-auth": "^0.10.9",
    "better-auth": "1.4.9",
    "convex": "^1.31.2",
    "@base-ui/react": "^1.0.0",
    "@hookform/resolvers": "^5.1.1",
    "@tanstack/react-form": "^1.12.3",
    "@tanstack/react-router": "^1.141.1",
    "lucide-react": "^0.473.0",
    "next-themes": "^0.4.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "sonner": "^2.0.5"
  }
}
```

Add scripts:

```json
{
  "scripts": {
    "dev:web": "turbo dev -F @jonsoc/web",
    "dev:convex": "turbo dev -F @jonsoc/convex",
    "check-types": "turbo check-types"
  }
}
```

#### 1.3 Merge Turborepo Configuration

**Merge `turbo.json` into root:**

Current root turbo.json likely has tasks. Add new ones:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "dev:setup": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Phase 2: Web Package Migration (Days 6-12)

#### 2.1 Package Structure

```
packages/web/
├── src/
│   ├── routes/
│   │   ├── __root.tsx          # Copy from jonsoc-front-and-back
│   │   ├── index.tsx           # Copy from jonsoc-front-and-back
│   │   ├── dashboard.tsx       # Copy from jonsoc-front-and-back
│   │   └── routeTree.gen.ts    # Generated by TanStack Router
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── sonner.tsx
│   │   ├── header.tsx
│   │   ├── loader.tsx
│   │   ├── mode-toggle.tsx
│   │   ├── sign-in-form.tsx
│   │   ├── sign-up-form.tsx
│   │   ├── theme-provider.tsx
│   │   └── user-menu.tsx
│   ├── lib/
│   │   ├── auth-client.ts      # Better-Auth client setup
│   │   └── utils.ts            # Utility functions (cn, etc.)
│   ├── main.tsx                # React entry point
│   └── index.css               # Tailwind v4 CSS
├── components.json             # shadcn/ui configuration
├── index.html                  # HTML template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── vite.config.ts              # Vite + TanStack Router
```

#### 2.2 Copy All Web Files

```bash
# Backup old web
mv packages/web packages/web-astro-backup

# Create new structure
mkdir -p packages/web/src/{routes,components/ui,lib}

# Copy all source files
cp -r jonsoc-front-and-back/apps/web/src/* packages/web/src/
cp jonsoc-front-and-back/apps/web/index.html packages/web/
cp jonsoc-front-and-back/apps/web/vite.config.ts packages/web/
cp jonsoc-front-and-back/apps/web/tsconfig.json packages/web/
cp jonsoc-front-and-back/apps/web/components.json packages/web/
```

#### 2.3 Update Web Package.json

```json
{
  "name": "@jonsoc/web",
  "version": "1.1.34",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "serve": "vite preview",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@base-ui/react": "catalog:",
    "@convex-dev/better-auth": "catalog:",
    "@hookform/resolvers": "catalog:",
    "@jonsoc/convex": "workspace:*",
    "@jonsoc/env": "workspace:*",
    "@jonsoc/brand": "workspace:*",
    "@tailwindcss/vite": "catalog:",
    "@tanstack/react-form": "catalog:",
    "@tanstack/react-router": "catalog:",
    "better-auth": "catalog:",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "convex": "catalog:",
    "lucide-react": "catalog:",
    "next-themes": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "sonner": "catalog:",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.2.5",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@jonsoc/config": "workspace:*",
    "@tanstack/react-router-devtools": "catalog:",
    "@tanstack/router-plugin": "catalog:",
    "@types/react": "19.2.7",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}
```

#### 2.4 Update Import References

**In `packages/web/src/lib/auth-client.ts`:**

```typescript
// Before
import { env } from "@jonsoc-front-and-back/env"

// After
import { env } from "@jonsoc/env"
```

**In `packages/web/src/routes/*.tsx`:**

```typescript
// Before
import { api } from "@jonsoc-front-and-back/backend/convex"

// After
import { api } from "@jonsoc/convex"
```

**Update `vite.config.ts` for path aliases:**

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [tailwindcss(), tanstackRouter({}), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
  },
})
```

### Phase 3: Convex Backend Migration (Days 13-18)

#### 3.1 Package Structure

```
packages/convex/
├── convex/
│   ├── _generated/             # Auto-generated by convex dev
│   │   ├── api.d.ts
│   │   ├── api.js
│   │   ├── dataModel.d.ts
│   │   └── server.d.ts
│   ├── auth.ts                 # Better-Auth configuration
│   ├── auth.config.ts          # Auth provider config
│   ├── convex.config.ts        # Convex app config
│   ├── healthCheck.ts          # Health check endpoint
│   ├── http.ts                 # HTTP actions
│   ├── privateData.ts          # Private data functions
│   ├── schema.ts               # Database schema
│   └── tsconfig.json           # Convex TS config
├── .env.local                  # Environment variables
├── .gitignore                  # Git ignore
└── package.json                # Package config
```

#### 3.2 Copy All Convex Files

```bash
mkdir -p packages/convex/convex/_generated

# Copy convex source files
cp jonsoc-front-and-back/packages/backend/convex/*.ts packages/convex/convex/
cp jonsoc-front-and-back/packages/backend/convex/tsconfig.json packages/convex/convex/
cp jonsoc-front-and-back/packages/backend/.env.local packages/convex/
cp jonsoc-front-and-back/packages/backend/.gitignore packages/convex/

# Copy generated files (will be regenerated, but helps initial setup)
cp jonsoc-front-and-back/packages/backend/convex/_generated/* packages/convex/convex/_generated/
```

#### 3.3 Update Convex Package.json

```json
{
  "name": "@jonsoc/convex",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./convex/_generated/api.js",
    "./convex": "./convex/_generated/api.js"
  },
  "scripts": {
    "dev": "convex dev",
    "dev:setup": "convex dev --configure --until-success",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@convex-dev/better-auth": "catalog:",
    "better-auth": "catalog:",
    "convex": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@jonsoc/config": "workspace:*",
    "typescript": "catalog:"
  }
}
```

#### 3.4 Generate Convex Types

```bash
cd packages/convex
bunx convex dev
```

This will:

- Validate schema
- Generate `_generated/` types
- Start Convex dev server

### Phase 4: Environment Setup (Days 19-22)

#### 4.1 Web Environment Variables

Create `packages/web/.env`:

```
VITE_CONVEX_URL=http://localhost:3210
VITE_CONVEX_SITE_URL=http://localhost:3211
```

Create `packages/web/.env.example`:

```
# Convex URLs
VITE_CONVEX_URL=
VITE_CONVEX_SITE_URL=
```

#### 4.2 Convex Environment Variables

`packages/convex/.env.local` (copy from source):

```
# Convex deployment
CONVEX_DEPLOYMENT=your-deployment-url
CONVEX_ADMIN_KEY=your-admin-key

# Better-Auth
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3001
```

#### 4.3 Environment Validation

Update `packages/env/src/web.ts`:

```typescript
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CONVEX_URL: z.string().url(),
    VITE_CONVEX_SITE_URL: z.string().url(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
```

### Phase 5: Git & Tooling Configuration (Days 23-25)

#### 5.1 Merge .gitignore Patterns

Add to root `.gitignore`:

```gitignore
# Convex
.convex/
packages/convex/.env.local

# Vite
*.vite/
packages/web/.env

# Generated files
packages/*/convex/_generated/
```

#### 5.2 shadcn/ui Configuration

Ensure `packages/web/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-lyra",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Phase 6: Cleanup & Removal (Days 26-28)

#### 6.1 Remove Old Packages

After confirming new web app works:

```bash
# Remove SolidJS app
rm -rf packages/app

# Remove Astro web backup
rm -rf packages/web-astro-backup

# Clean install
bun install
```

#### 6.2 Archive Source

```bash
# Move to archive
mv jonsoc-front-and-back /tmp/jonsoc-front-and-back-archive
# Or delete if confident
rm -rf jonsoc-front-and-back
```

### Phase 7: Testing & Validation (Days 29-30)

#### 7.1 Installation Test

```bash
# Clean install
rm -rf node_modules bun.lockb
bun install
```

#### 7.2 Type Checking

```bash
bun run check-types
```

#### 7.3 Dev Server Test

Terminal 1:

```bash
bun run dev:convex
```

Terminal 2:

```bash
bun run dev:web
```

#### 7.4 Build Test

```bash
bun run --cwd packages/web build
```

## Critical Configuration Checklist

### Must Have - Configuration Files

- [ ] `packages/config/tsconfig.base.json` - Shared TS config
- [ ] `packages/env/src/web.ts` - Environment validation
- [ ] `packages/web/components.json` - shadcn/ui config
- [ ] `packages/web/vite.config.ts` - Vite + TanStack Router
- [ ] `packages/web/tsconfig.json` - Web TS config
- [ ] `packages/convex/convex/tsconfig.json` - Convex TS config
- [ ] `turbo.json` merged into root

### Must Have - Environment Setup

- [ ] `packages/web/.env` (not committed) with VITE_CONVEX_URL
- [ ] `packages/web/.env.example` (template)
- [ ] `packages/convex/.env.local` with Convex + Better-Auth secrets
- [ ] `@jonsoc/env` package for validation

### Must Have - Dependencies

- [ ] `@t3-oss/env-core` in root catalog
- [ ] `@tanstack/router-plugin` in root catalog
- [ ] `@convex-dev/better-auth` in root catalog
- [ ] `convex` in root catalog
- [ ] `better-auth` in root catalog
- [ ] React 19 in root catalog
- [ ] All shadcn/ui dependencies

### Must Have - Generated Files

- [ ] `packages/web/src/routeTree.gen.ts` (generated)
- [ ] `packages/convex/convex/_generated/*` (generated by convex dev)

## Common Migration Issues

### Issue: "Cannot find module '@jonsoc/convex'"

**Fix:** Ensure convex package has proper exports in package.json

### Issue: TanStack Router routes not found

**Fix:** Check vite.config.ts has `@tanstack/router-plugin/vite` plugin

### Issue: Environment variables not loading

**Fix:** Ensure `.env` file exists and @t3-oss/env-core is configured correctly

### Issue: Convex types not generated

**Fix:** Run `bunx convex dev` in packages/convex directory

### Issue: Path alias `@/` not resolving

**Fix:** Check vite.config.ts has resolve.alias configured

## Commands Quick Reference

```bash
# Install everything
bun install

# Start Convex backend
cd packages/convex && bun dev

# Start web frontend (in new terminal)
cd packages/web && bun dev

# Or use turbo from root
bun run dev:convex  # Terminal 1
bun run dev:web     # Terminal 2

# Typecheck everything
bun run check-types

# Build web
bun run --cwd packages/web build

# Generate Convex types
bun run --cwd packages/convex dev
```

## Success Criteria

- [ ] All files copied from jonsoc-front-and-back
- [ ] packages/config/ created with tsconfig.base.json
- [ ] packages/env/ created with web.ts
- [ ] packages/web/ has all components, routes, lib files
- [ ] packages/convex/ has all convex files + \_generated
- [ ] turbo.json merged into root
- [ ] Root package.json catalog updated
- [ ] .gitignore updated
- [ ] Environment files configured
- [ ] Dev servers start without errors
- [ ] TypeScript strict mode passes
- [ ] All routes load correctly
- [ ] Auth flow works
- [ ] packages/app/ removed
- [ ] jonsoc-front-and-back/ archived

---

**Total Duration**: 30 days
**Complexity**: Very High (multiple packages, configurations, integrations)
**Dependencies**: Bun, Convex account, Better-Auth setup
