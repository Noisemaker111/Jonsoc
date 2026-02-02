import type { Argv } from "yargs"
import path from "path"
import { existsSync } from "fs"
import { spawnSync } from "child_process"
import { cmd } from "./cmd"

function findRepoRoot(cwd: string): string | undefined {
  const entry = path.join(cwd, "packages", "jonsoc", "src", "index.ts")
  if (existsSync(entry)) return cwd
  const parent = path.dirname(cwd)
  if (parent === cwd) return undefined
  return findRepoRoot(parent)
}

export const DevCommand = cmd({
  command: "dev [args..]",
  describe: "run the local development version of jonsoc",
  builder: (yargs: Argv) => {
    return yargs.positional("args", {
      describe: "arguments to pass to jonsoc",
      type: "string",
      array: true,
      default: [],
    })
  },
  handler: async (args) => {
    const root = findRepoRoot(process.cwd())
    if (!root) {
      console.error("[jonsoc] Not in jonsoc repository root")
      process.exit(1)
    }

    const workdir = path.join(root, "packages", "jonsoc")
    const extraArgs = args.args || []
    const allArgs = ["run", "--conditions=browser", "src/index.ts", ...extraArgs]

    const result = spawnSync("bun", allArgs, {
      stdio: "inherit",
      cwd: workdir,
      env: {
        ...process.env,
        JONSOC_WORKDIR: root,
        JOC_WORKDIR: root,
        OPENCODE_WORKDIR: root,
      },
    })

    process.exit(result.status ?? 0)
  },
})
