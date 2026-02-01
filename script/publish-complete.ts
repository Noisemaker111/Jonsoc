#!/usr/bin/env bun

import { Script } from "@jonsoc/script"
import { $ } from "bun"

if (!Script.preview) {
  await $`gh release edit v${Script.version} --draft=false`
}

await $`bun install`

await $`gh release download --pattern "jonsoc-linux-*64.tar.gz" --pattern "jonsoc-darwin-*64.zip" -D dist`

await import(`../packages/jonsoc/script/publish-registries.ts`)
