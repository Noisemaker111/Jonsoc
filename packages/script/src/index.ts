import { $, semver } from "bun"
import path from "path"

const rootPkgPath = path.resolve(import.meta.dir, "../../../package.json")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}

const env = {
  OPENCODE_CHANNEL: process.env["OPENCODE_CHANNEL"] || "latest",
  OPENCODE_BUMP: process.env["OPENCODE_BUMP"],
  OPENCODE_VERSION: process.env["OPENCODE_VERSION"],
}
const CHANNEL = await (async () => {
  if (env.OPENCODE_CHANNEL !== "latest") return env.OPENCODE_CHANNEL
  if (env.OPENCODE_BUMP) return "latest"
  if (env.OPENCODE_VERSION && !env.OPENCODE_VERSION.startsWith("0.0.0-")) return "latest"
  return "latest"
})()
const IS_PREVIEW = CHANNEL !== "latest"

const VERSION = await (async () => {
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`

  const raw = env.OPENCODE_VERSION ?? ""
  const base = raw.trim() ? raw.trim() : "1.1.41"
  const bump = env.OPENCODE_BUMP
  if (!bump) return base

  const match = base.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) throw new Error(`Cannot bump invalid version: ${base}`)

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])

  if (bump === "major") return `${major + 1}.0.0`
  if (bump === "minor") return `${major}.${minor + 1}.0`
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`

  throw new Error(`Unknown bump: ${bump}`)
})()

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
}
console.log(`opencode script`, JSON.stringify(Script, null, 2))
