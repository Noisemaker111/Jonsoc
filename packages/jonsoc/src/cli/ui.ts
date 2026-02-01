import z from "zod"
import { EOL } from "os"
import { NamedError } from "@jonsoc/util/error"
import * as path from "path"

export namespace UI {
  const LOGO = [
    [`                    `, `             ▄     `],
    [`█▀▀█ █▀▀█ █▀▀█ █▀▀▄ `, `█▀▀▀ █▀▀█ █▀▀█ █▀▀█`],
    [`█░░█ █░░█ █▀▀▀ █░░█ `, `█░░░ █░░█ █░░█ █▀▀▀`],
    [`▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ `, `▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀`],
  ]

  export const CancelledError = NamedError.create("UICancelledError", z.void())

  export const Style = {
    TEXT_HIGHLIGHT: "\x1b[96m",
    TEXT_HIGHLIGHT_BOLD: "\x1b[96m\x1b[1m",
    TEXT_DIM: "\x1b[90m",
    TEXT_DIM_BOLD: "\x1b[90m\x1b[1m",
    TEXT_NORMAL: "\x1b[0m",
    TEXT_NORMAL_BOLD: "\x1b[1m",
    TEXT_WARNING: "\x1b[93m",
    TEXT_WARNING_BOLD: "\x1b[93m\x1b[1m",
    TEXT_DANGER: "\x1b[91m",
    TEXT_DANGER_BOLD: "\x1b[91m\x1b[1m",
    TEXT_SUCCESS: "\x1b[92m",
    TEXT_SUCCESS_BOLD: "\x1b[92m\x1b[1m",
    TEXT_INFO: "\x1b[94m",
    TEXT_INFO_BOLD: "\x1b[94m\x1b[1m",
  }

  export function println(...message: string[]) {
    print(...message)
    Bun.stderr.write(EOL)
  }

  export function print(...message: string[]) {
    blank = false
    Bun.stderr.write(message.join(" "))
  }

  let blank = false
  export function empty() {
    if (blank) return
    println("" + Style.TEXT_NORMAL)
    blank = true
  }

  export function logo(pad?: string) {
    const result = []
    for (const row of LOGO) {
      if (pad) result.push(pad)
      result.push(Bun.color("gray", "ansi"))
      result.push(row[0])
      result.push("\x1b[0m")
      result.push(row[1])
      result.push(EOL)
    }
    return result.join("").trimEnd()
  }

  export async function input(prompt: string): Promise<string> {
    const readline = require("readline")
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    return new Promise((resolve) => {
      rl.question(prompt, (answer: string) => {
        rl.close()
        resolve(answer.trim())
      })
    })
  }

  export function error(message: string) {
    println(Style.TEXT_DANGER_BOLD + "Error: " + Style.TEXT_NORMAL + message)
  }

  // Context keywords that indicate a file reference (case-insensitive)
  const FILE_REF_KEYWORDS = ["edit", "file", "at", "in", "see", "check", "open", "view", "read"]

  // Regex to match file references with context keywords
  // Supports: / and \ separators, quoted paths, optional line numbers
  // Matches: "Edit packages/jonsoc/src/cli/ui.ts:81" or "File: src/main.rs"
  // The path group excludes colons so line numbers are captured separately
  // Case-insensitive matching with 'i' flag
  const fileRefRegex = new RegExp(
    `(?:^|\\s)(?:${FILE_REF_KEYWORDS.join("|")})(?::)?\\s+([\`'"<]?)([^\\s\`'">:]+)(?::(\\d+))?([\`'">]?)`,
    "gi",
  )

  // Regex to detect if something looks like a path (for validation)
  // Must contain at least one / or \ to be a path
  const pathLikeRegex = /[\\/]/

  export function markdown(text: string): string {
    return text.replace(fileRefRegex, (match, quoteOpen, filePath, lineNum, quoteClose) => {
      // Check if it looks like a path
      if (!pathLikeRegex.test(filePath)) return match

      // Normalize path separators
      const normalizedPath = filePath.replace(/\\/g, "/")
      const fullPath = path.resolve(process.cwd(), normalizedPath)
      const normalizedFullPath = fullPath.replace(/\\/g, "/")

      let url = "file://"
      if (/^[A-Za-z]:/.test(normalizedFullPath)) {
        url += "/" + normalizedFullPath
      } else {
        url += normalizedFullPath
      }
      if (lineNum) url += `:${lineNum}`
      return `\x1b]8;;${url}\x1b\\${match}\x1b]8;;\x1b\\`
    })
  }
}
