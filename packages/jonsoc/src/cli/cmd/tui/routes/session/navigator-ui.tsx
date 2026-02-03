import { createMemo, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme, selectedForeground } from "@tui/context/theme"
import { Locale } from "@/util/locale"
import path from "path"
import { LANGUAGE_EXTENSIONS } from "@/lsp/language"
import type { File as FileStatus, FileNode, VcsHistoryLine, FileContent } from "@jonsoc/sdk/v2"

export const NavigatorBorderChars = {
  vertical: "│",
  horizontal: "─",
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
}

export function Tab(props: { label: string; active: boolean; onSelect: () => void }) {
  const theme = useTheme()
  return (
    <box
      flexShrink={0}
      paddingLeft={3}
      paddingRight={3}
      backgroundColor={props.active ? theme.theme.backgroundPanel : theme.theme.background}
      onMouseUp={props.onSelect}
      flexDirection="row"
      justifyContent="center"
    >
      <text
        fg={props.active ? theme.theme.primary : theme.theme.textMuted}
        attributes={props.active ? TextAttributes.BOLD : undefined}
        wrapMode="none"
      >
        {props.label.toUpperCase()}
      </text>
    </box>
  )
}

export function ActionButton(props: {
  label: string
  onSelect: () => void
  disabled?: boolean
  primary?: boolean
  flexGrow?: number
}) {
  const theme = useTheme()
  const bg = createMemo(() => {
    if (props.disabled) return theme.theme.backgroundElement
    if (props.primary) return theme.theme.primary
    return theme.theme.backgroundElement
  })
  const fg = createMemo(() => {
    if (props.disabled) return theme.theme.textMuted
    if (props.primary) return selectedForeground(theme.theme, theme.theme.primary)
    return theme.theme.text
  })

  return (
    <box
      flexGrow={props.flexGrow ?? 1}
      flexShrink={0}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={bg()}
      onMouseDown={(event) => {
        event.stopPropagation()
        if (props.disabled) return
        props.onSelect()
      }}
      onMouseUp={(event) => event.stopPropagation()}
      justifyContent="center"
    >
      <text fg={fg()} wrapMode="none" attributes={props.primary ? TextAttributes.BOLD : undefined}>
        {props.label}
      </text>
    </box>
  )
}

export function ExplorerRow(props: {
  entry: { node: FileNode; depth: number }
  active: boolean
  expanded: boolean
  width: number
  status?: FileStatus
  onSelect: () => void
}) {
  const theme = useTheme()
  const indicator = createMemo(() => {
    if (props.entry.node.type !== "directory") return " "
    return props.expanded ? "v" : ">"
  })

  const STATUS_LABELS: Record<string, string> = {
    added: "A",
    deleted: "D",
    modified: "M",
  }

  const statusLabel = createMemo(() => {
    if (!props.status) return ""
    return STATUS_LABELS[props.status.status] || ""
  })

  const statusColor = createMemo(() => {
    const status = props.status
    if (!status) return theme.theme.textMuted
    if (status.status === "added") return theme.theme.diffAdded
    if (status.status === "deleted") return theme.theme.diffRemoved
    return theme.theme.warning
  })

  const fg = createMemo(() => {
    if (props.active) return selectedForeground(theme.theme, theme.theme.primary)
    if (props.entry.node.ignored) return theme.theme.textMuted
    return theme.theme.text
  })

  const nameWidth = createMemo(() => Math.max(10, props.width - (props.entry.depth * 2 + 6)))

  return (
    <box
      id={props.entry.node.path}
      flexDirection="row"
      paddingLeft={props.entry.depth * 2 + 1}
      paddingRight={1}
      backgroundColor={props.active ? theme.theme.primary : theme.theme.background}
      onMouseUp={props.onSelect}
      justifyContent="space-between"
    >
      <text fg={fg()} wrapMode="none">
        {indicator()} {Locale.truncate(props.entry.node.name, nameWidth())}
      </text>
      <Show when={statusLabel()}>
        <text
          fg={props.active ? selectedForeground(theme.theme, theme.theme.primary) : statusColor()}
          wrapMode="none"
          flexShrink={0}
        >
          {statusLabel()}
        </text>
      </Show>
    </box>
  )
}

export function GitRow(props: {
  entry: FileStatus & { staged?: boolean }
  active: boolean
  width: number
  onSelect: () => void
  onAction?: () => void
  actionLabel?: string
}) {
  const theme = useTheme()
  const fg = createMemo(() => {
    if (props.active) return selectedForeground(theme.theme, theme.theme.primary)
    return theme.theme.text
  })
  const stats = createMemo(() => {
    const added = String(props.entry.added).padStart(3, " ")
    const removed = String(props.entry.removed).padStart(3, " ")
    return { added, removed }
  })
  const statusColor = createMemo(() => {
    if (props.entry.status === "added") return theme.theme.diffAdded
    if (props.entry.status === "deleted") return theme.theme.diffRemoved
    return theme.theme.warning
  })

  const STATUS_LABELS: Record<string, string> = {
    added: "A",
    deleted: "D",
    modified: "M",
  }

  const pathWidth = createMemo(() => {
    const actionWidth = props.onAction ? 4 : 0
    return Math.max(10, props.width - 14 - actionWidth)
  })

  return (
    <box
      id={props.entry.path}
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={props.active ? theme.theme.primary : theme.theme.background}
      justifyContent="space-between"
      onMouseUp={props.onSelect}
    >
      <box flexDirection="row" gap={1}>
        <text fg={props.active ? fg() : statusColor()} wrapMode="none">
          {STATUS_LABELS[props.entry.status]}
        </text>
        <text fg={fg()} wrapMode="none">
          {Locale.truncateMiddle(props.entry.path, pathWidth())}
        </text>
      </box>
      <box flexDirection="row" gap={1} flexShrink={0}>
        <box width={9} justifyContent="flex-end" flexShrink={0}>
          <text fg={props.active ? fg() : theme.theme.textMuted} wrapMode="none" flexShrink={0}>
            <span style={{ fg: theme.theme.diffAdded }}>+{stats().added}</span>
            <span style={{ fg: theme.theme.diffRemoved }}> -{stats().removed}</span>
          </text>
        </box>
        <Show when={props.onAction && props.actionLabel}>
          <box
            width={3}
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={props.active ? theme.theme.primary : theme.theme.backgroundElement}
            onMouseDown={(e) => {
              e.stopPropagation()
              props.onAction?.()
            }}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <text
              fg={props.active ? selectedForeground(theme.theme, theme.theme.primary) : theme.theme.textMuted}
              wrapMode="none"
              attributes={TextAttributes.BOLD}
            >
              {props.actionLabel}
            </text>
          </box>
        </Show>
      </box>
    </box>
  )
}

export function fileType(input?: string) {
  if (!input) return "none"
  const ext = path.extname(input)
  const language = LANGUAGE_EXTENSIONS[ext]
  if (!language) return "none"
  if (["typescriptreact", "javascriptreact", "javascript"].includes(language)) return "typescript"
  return language
}

export function BinaryPreview(props: { content?: FileContent }) {
  const theme = useTheme()
  const description = createMemo(() => {
    const data = props.content
    if (!data) return "Binary file"
    if (!data.mimeType) return "Binary file"
    return `Binary file (${data.mimeType})`
  })

  return <text fg={theme.theme.textMuted}>{description()}</text>
}
