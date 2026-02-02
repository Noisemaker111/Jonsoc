#!/usr/bin/env bun
// Temporary manual publish script
// Use this to create packages initially, then switch to CI trusted publishing

import { spawnSync } from "child_process"
import path from "path"

const packages = [
  { name: "@jonsoc/util", dir: "packages/util" },
  { name: "@jonsoc/env", dir: "packages/env" },
  { name: "@jonsoc/sdk", dir: "packages/sdk/js" },
  { name: "@jonsoc/script", dir: "packages/script" },
  { name: "@jonsoc/plugin", dir: "packages/plugin" },
  { name: "@jonsoc/slack", dir: "packages/slack" },
  { name: "@jonsoc/convex", dir: "packages/convex" },
  { name: "@jonsoc/ui", dir: "packages/ui" },
  { name: "@jonsoc/app", dir: "packages/app" },
  { name: "@jonsoc/web", dir: "packages/web" },
  { name: "@jonsoc/console-resource", dir: "packages/console/resource" },
  { name: "@jonsoc/console-app", dir: "packages/console/app" },
]

console.log("========================================")
console.log("Manual NPM Publish Script")
console.log("========================================")
console.log("")
console.log("This script will help you publish packages manually.")
console.log("You need to be logged in to npm with 'npm login'")
console.log("")

// Check if user is logged in
const whoami = spawnSync("npm", ["whoami"], { encoding: "utf8" })
if (whoami.status !== 0) {
  console.error("❌ Not logged in to npm. Run: npm login")
  process.exit(1)
}

console.log(`✅ Logged in as: ${whoami.stdout.trim()}`)
console.log("")

for (const pkg of packages) {
  const pkgPath = path.join(process.cwd(), pkg.dir)
  console.log(`\n📦 ${pkg.name}`)
  console.log(`   Path: ${pkgPath}`)

  // Check if already published
  const view = spawnSync("npm", ["view", pkg.name, "version"], {
    encoding: "utf8",
    stdio: "pipe",
  })

  if (view.status === 0) {
    console.log(`   ✅ Already published (version ${view.stdout.trim()})`)
    continue
  }

  console.log(`   📝 Publishing...`)
  const result = spawnSync("npm", ["publish", "--access", "public"], {
    cwd: pkgPath,
    stdio: "inherit",
    shell: true,
  })

  if (result.status === 0) {
    console.log(`   ✅ Published successfully`)
  } else {
    console.error(`   ❌ Failed to publish`)
  }
}

console.log("\n========================================")
console.log("Next Steps:")
console.log("========================================")
console.log("")
console.log("1. Go to each package on npmjs.com")
console.log("2. Click 'Settings' → 'Trusted Publishers'")
console.log("3. Add 'Noisemaker111/Jonsoc' as trusted publisher")
console.log("4. Re-run the GitHub Actions workflow")
console.log("")
console.log("See NPM_SETUP.md for detailed instructions.")
