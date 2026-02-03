import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { $ } from "bun"
import path from "path"
import z from "zod"
import { Log } from "@/util/log"
import { Instance } from "./instance"
import { FileWatcher } from "@/file/watcher"

const log = Log.create({ service: "vcs" })

export namespace Vcs {
  export const Event = {
    BranchUpdated: BusEvent.define(
      "vcs.branch.updated",
      z.object({
        branch: z.string().optional(),
      }),
    ),
  }

  export const Info = z
    .object({
      branch: z.string(),
    })
    .meta({
      ref: "VcsInfo",
    })
  export type Info = z.infer<typeof Info>

  export const HistoryLine = z
    .object({
      graph: z.string(),
      hash: z.string().optional(),
      subject: z.string().optional(),
      refs: z.array(z.string()).optional(),
      author: z.string().optional(),
    })
    .meta({
      ref: "VcsHistoryLine",
    })
  export type HistoryLine = z.infer<typeof HistoryLine>

  async function currentBranch() {
    return $`git rev-parse --abbrev-ref HEAD`
      .quiet()
      .nothrow()
      .cwd(Instance.worktree)
      .text()
      .then((x) => x.trim())
      .catch(() => undefined)
  }

  const state = Instance.state(
    async () => {
      if (Instance.project.vcs !== "git") {
        return { branch: async () => undefined, unsubscribe: undefined }
      }
      let current = await currentBranch()
      log.info("initialized", { branch: current })

      const unsubscribe = Bus.subscribe(FileWatcher.Event.Updated, async (evt) => {
        if (evt.properties.file.endsWith("HEAD")) return
        const next = await currentBranch()
        if (next !== current) {
          log.info("branch changed", { from: current, to: next })
          current = next
          Bus.publish(Event.BranchUpdated, { branch: next })
        }
      })

      return {
        branch: async () => current,
        unsubscribe,
      }
    },
    async (state) => {
      state.unsubscribe?.()
    },
  )

  export async function init() {
    return state()
  }

  export async function branch() {
    return await state().then((s) => s.branch())
  }

  const HISTORY_SEPARATOR = "\x1f"
  const HISTORY_LIMIT = 60

  function parseHistoryLine(line: string): HistoryLine {
    if (!line.includes(HISTORY_SEPARATOR)) return { graph: line }
    const first = line.indexOf(HISTORY_SEPARATOR)
    const second = line.indexOf(HISTORY_SEPARATOR, first + HISTORY_SEPARATOR.length)
    if (second === -1) return { graph: line }
    const third = line.indexOf(HISTORY_SEPARATOR, second + HISTORY_SEPARATOR.length)

    const prefix = line.slice(0, first)
    const hashIndex = prefix.lastIndexOf(" ")
    const graph = hashIndex >= 0 ? prefix.slice(0, hashIndex + 1) : ""
    const hash = hashIndex >= 0 ? prefix.slice(hashIndex + 1) : prefix
    const subject = line.slice(first + HISTORY_SEPARATOR.length, second)
    const refsRaw =
      third === -1
        ? line.slice(second + HISTORY_SEPARATOR.length).trim()
        : line.slice(second + HISTORY_SEPARATOR.length, third).trim()
    const refs = refsRaw.length ? refsRaw.split(", ").filter(Boolean) : undefined
    const author = third !== -1 ? line.slice(third + HISTORY_SEPARATOR.length).trim() : undefined

    return {
      graph,
      hash: hash.length ? hash : undefined,
      subject: subject.length ? subject : undefined,
      refs,
      author,
    }
  }

  export async function history(limit = HISTORY_LIMIT) {
    if (Instance.project.vcs !== "git") return []
    const size = Math.min(Math.max(limit, 1), 200)
    const format = `%h${HISTORY_SEPARATOR}%s${HISTORY_SEPARATOR}%D${HISTORY_SEPARATOR}%an`
    const output = await $`git log --graph --decorate=short --pretty=format:${format} --all -n ${size}`
      .quiet()
      .nothrow()
      .cwd(Instance.worktree)
      .text()
      .catch(() => "")
    if (!output.trim()) return []
    return output
      .split("\n")
      .map((line) => line.trimEnd())
      .map(parseHistoryLine)
  }

  export async function branches() {
    if (Instance.project.vcs !== "git") return []
    const output = await $`git branch -a --format='%(refname:short)'`
      .quiet()
      .nothrow()
      .cwd(Instance.worktree)
      .text()
      .catch(() => "")
    return output
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
  }

  export async function stage(filePath: string) {
    if (Instance.project.vcs !== "git") return false
    const result = await $`git add ${filePath}`.quiet().nothrow().cwd(Instance.worktree)
    return result.exitCode === 0
  }

  export async function unstage(filePath: string) {
    if (Instance.project.vcs !== "git") return false
    const result = await $`git reset HEAD ${filePath}`.quiet().nothrow().cwd(Instance.worktree)
    return result.exitCode === 0
  }

  export async function push() {
    if (Instance.project.vcs !== "git") return false
    const result = await $`git push`.quiet().nothrow().cwd(Instance.worktree)
    return result.exitCode === 0
  }
}
