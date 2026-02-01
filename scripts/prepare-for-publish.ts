#!/usr/bin/env bun
/**
 * Script to replace workspace and catalog dependencies with actual npm versions
 * for publishing the jonsoc package.
 * Creates a temporary package.json for publishing without modifying the original.
 */

import { $ } from "bun"
import path from "path"

const pkgPath = "packages/jonsoc/package.json"
const rootPkgPath = "package.json"

// Read packages
const pkg = await Bun.file(pkgPath).json()
const rootPkg = await Bun.file(rootPkgPath).json()
const catalog = rootPkg.workspaces.catalog

// Map of replacements
const replacements: Record<string, string> = {
  // Workspace packages - use current version
  "@jonsoc/plugin": "1.1.43",
  "@jonsoc/script": "1.1.43",
  "@jonsoc/sdk": "1.1.43",
  "@jonsoc/util": "1.1.43",
  // Catalog dependencies
  "@hono/zod-validator": catalog["@hono/zod-validator"],
  "@octokit/rest": catalog["@octokit/rest"],
  "@openauthjs/openauth": catalog["@openauthjs/openauth"],
  "@pierre/diffs": catalog["@pierre/diffs"],
  "@tsconfig/bun": catalog["@tsconfig/bun"],
  "@types/bun": catalog["@types/bun"],
  "@typescript/native-preview": catalog["@typescript/native-preview"],
  ai: catalog["ai"],
  diff: catalog["diff"],
  hono: catalog["hono"],
  "hono-openapi": catalog["hono-openapi"],
  remeda: catalog["remeda"],
  "solid-js": catalog["solid-js"],
  typescript: catalog["typescript"],
  ulid: catalog["ulid"],
  zod: catalog["zod"],
}

// Replace in dependencies
if (pkg.dependencies) {
  for (const [key, value] of Object.entries(pkg.dependencies)) {
    if (value === "workspace:*" || value === "catalog:") {
      const replacement = replacements[key]
      if (replacement) {
        console.log(`Replacing ${key}: ${value} -> ${replacement}`)
        pkg.dependencies[key] = replacement
      } else {
        console.warn(`⚠️ No replacement found for ${key}: ${value}`)
      }
    }
  }
}

// Replace in devDependencies
if (pkg.devDependencies) {
  for (const [key, value] of Object.entries(pkg.devDependencies)) {
    if (value === "workspace:*" || value === "catalog:") {
      const replacement = replacements[key]
      if (replacement) {
        console.log(`Replacing ${key}: ${value} -> ${replacement}`)
        pkg.devDependencies[key] = replacement
      } else {
        console.warn(`⚠️ No replacement found for ${key}: ${value}`)
      }
    }
  }
}

// Write updated package.json
await Bun.file(pkgPath).write(JSON.stringify(pkg, null, 2))
console.log("\n✅ Updated package.json for publishing")
