type FileRefSegment = { type: "text"; text: string } | { type: "fileref"; text: string; path: string; line?: number }

export type MarkdownLine = { text: string; isCode: boolean }

const FILE_REF_KEYWORDS = ["edit", "file", "at", "in", "see", "check", "open", "view", "read"]
const fileRefPattern = `(?:^|\\s)(?:${FILE_REF_KEYWORDS.join("|")})(?::)?\\s+([\`'"<]?)([^\\s\`'">:]+)(?::(\\d+))?([\`'">]?)`
const pathLikeRegex = /[\\/]/

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
}

function wrapWords(text: string, width: number): string[] {
  const safeWidth = Math.max(10, width)
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [""]

  const lines: string[] = []
  let line = words[0]

  for (let i = 1; i < words.length; i += 1) {
    const word = words[i]
    if (line.length + 1 + word.length <= safeWidth) {
      line = `${line} ${word}`
      continue
    }

    lines.push(line)
    line = word
  }

  lines.push(line)
  return lines
}

export function formatMarkdownLines(text: string, width: number): MarkdownLine[] {
  const lines: MarkdownLine[] = []
  const safeWidth = Math.max(20, width)
  const rawLines = text.replace(/\r\n/g, "\n").split("\n")
  let inCodeBlock = false

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim()
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock
      lines.push({ text: rawLine, isCode: true })
      continue
    }

    if (inCodeBlock) {
      lines.push({ text: rawLine, isCode: true })
      continue
    }

    const leadingMatch = rawLine.match(/^\s*/)
    const leading = leadingMatch ? leadingMatch[0] : ""
    let content = stripInlineMarkdown(rawLine.slice(leading.length))

    const headingMatch = content.match(/^#{1,6}\s+(.*)$/)
    if (headingMatch) {
      content = headingMatch[1]
    }

    const listMatch = content.match(/^([-*]|\d+\.)\s+(.*)$/)
    if (listMatch) {
      const marker = listMatch[1]
      const body = listMatch[2]
      const prefix = `${leading}${marker} `
      const wrapped = wrapWords(body, safeWidth - prefix.length)
      wrapped.forEach((line, index) => {
        const indent = index === 0 ? prefix : " ".repeat(prefix.length)
        lines.push({ text: `${indent}${line}`, isCode: false })
      })
      continue
    }

    const wrapped = wrapWords(content, safeWidth - leading.length)
    wrapped.forEach((line) => {
      lines.push({ text: `${leading}${line}`, isCode: false })
    })
  }

  return lines
}

export function splitFileRefs(line: string): FileRefSegment[] {
  const segments: FileRefSegment[] = []
  const regex = new RegExp(fileRefPattern, "gi")
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    const before = line.slice(lastIndex, match.index)
    if (before) {
      segments.push({ type: "text", text: before })
    }

    const matchText = match[0]
    const filePath = match[2]
    const lineNum = match[3] ? parseInt(match[3], 10) : undefined
    if (pathLikeRegex.test(filePath)) {
      segments.push({ type: "fileref", text: matchText, path: filePath, line: lineNum })
    } else {
      segments.push({ type: "text", text: matchText })
    }

    lastIndex = match.index + matchText.length
  }

  const remaining = line.slice(lastIndex)
  if (remaining) {
    segments.push({ type: "text", text: remaining })
  }

  return segments
}

export function collectFileRefs(text: string): Array<{ path: string; line?: number }> {
  const refs: Array<{ path: string; line?: number }> = []
  const regex = new RegExp(fileRefPattern, "gi")
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const filePath = match[2]
    if (!pathLikeRegex.test(filePath)) continue
    const lineNum = match[3] ? parseInt(match[3], 10) : undefined
    refs.push({ path: filePath, line: lineNum })
  }

  return refs
}
