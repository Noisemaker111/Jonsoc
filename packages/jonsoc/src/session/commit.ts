import { $ } from "bun"
import path from "path"
import { Config } from "@/config/config"
import { Instance } from "@/project/instance"
import { Log } from "@/util/log"
import { MessageV2 } from "./message-v2"

export namespace SessionCommit {
  const log = Log.create({ service: "session.commit" })
  const maxSubjectLength = 72

  function outputText(input?: Uint8Array) {
    if (!input?.length) return ""
    return new TextDecoder().decode(input).trim()
  }

  function errorText(result: { stdout?: Uint8Array; stderr?: Uint8Array }) {
    return [outputText(result.stderr), outputText(result.stdout)].filter(Boolean).join("\n")
  }

  async function pushCommit(worktree: string) {
    const branch = await $`git rev-parse --abbrev-ref HEAD`.quiet().nothrow().cwd(worktree).text()
    const name = branch.trim()
    if (!name || name === "HEAD") return

    const upstream = await $`git rev-parse --abbrev-ref --symbolic-full-name @{u}`.quiet().nothrow().cwd(worktree)
    if (upstream.exitCode === 0) {
      const pushed = await $`git push`.quiet().nothrow().cwd(worktree)
      if (pushed.exitCode !== 0) {
        log.warn("auto push failed", { exitCode: pushed.exitCode, message: errorText(pushed) })
      }
      return
    }

    const pushed = await $`git push -u origin ${name}`.quiet().nothrow().cwd(worktree)
    if (pushed.exitCode !== 0) {
      log.warn("auto push failed", { exitCode: pushed.exitCode, message: errorText(pushed) })
    }
  }

  export async function autoCommit(input: {
    sessionID: string
    messageID?: string
    files: string[]
    worktree?: string
  }) {
    if (Instance.project.vcs !== "git") return
    if (input.files.length === 0) return

    const cfg = await Config.get()
    if (cfg.experimental?.vcs?.auto_commit === false) return

    const worktree = input.worktree ?? Instance.worktree
    const stagedCheck = await $`git diff --cached --quiet`.quiet().nothrow().cwd(worktree)
    if (stagedCheck.exitCode === 1) {
      log.info("skipping auto commit; staged changes present")
      return
    }
    if (stagedCheck.exitCode !== 0) {
      log.warn("failed to inspect staged changes", { exitCode: stagedCheck.exitCode })
      return
    }

    const relativePaths = input.files
      .map((file) => path.relative(worktree, file))
      .filter((file) => file && !file.startsWith(".."))
    if (relativePaths.length === 0) return

    const staged = await $`git add -- ${relativePaths}`.quiet().nothrow().cwd(worktree)
    if (staged.exitCode !== 0) {
      log.warn("auto commit stage failed", {
        exitCode: staged.exitCode,
        message: errorText(staged),
        files: relativePaths,
      })
      const retry = await $`git add -A -- ${relativePaths}`.quiet().nothrow().cwd(worktree)
      if (retry.exitCode !== 0) {
        log.warn("auto commit stage retry failed", {
          exitCode: retry.exitCode,
          message: errorText(retry),
          files: relativePaths,
        })
        return
      }
    }

    const hasChanges = await $`git diff --cached --quiet`.quiet().nothrow().cwd(worktree)
    if (hasChanges.exitCode === 0) return
    if (hasChanges.exitCode !== 1) {
      log.warn("auto commit diff failed", { exitCode: hasChanges.exitCode })
      return
    }

    const message = await buildCommitMessage(input.sessionID, input.messageID)
    const committed = await $`git commit -m ${message}`.quiet().nothrow().cwd(worktree)
    if (committed.exitCode !== 0) {
      log.warn("auto commit failed", { exitCode: committed.exitCode })
      return
    }
    await pushCommit(worktree)
  }

  async function buildCommitMessage(sessionID: string, messageID?: string) {
    const suffix = sessionID.slice(-6)
    const fallback = `session ${suffix}: update`
    if (!messageID) return fallback

    const message = await MessageV2.get({ sessionID, messageID }).catch(() => undefined)
    if (!message || message.info.role !== "user") return fallback

    const text = message.parts.find((part) => part.type === "text")
    const subject = text?.text.trim().split("\n")[0] ?? ""
    if (!subject) return fallback

    const trimmed = subject.length > maxSubjectLength ? subject.slice(0, maxSubjectLength - 3) + "..." : subject
    return `session ${suffix}: ${trimmed}`
  }
}
