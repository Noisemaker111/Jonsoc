import { useDialog } from "@tui/ui/dialog"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "@tui/context/theme"
import { useErrorLog } from "@tui/context/error-log"
import { Clipboard } from "@tui/util/clipboard"
import { useToast } from "@tui/ui/toast"
import { TextAttributes } from "@opentui/core"
import { For, Show, createSignal } from "solid-js"
import { Locale } from "@/util/locale"

export function DialogErrorLog() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const errorLog = useErrorLog()
  const toast = useToast()
  const dimensions = useTerminalDimensions()
  const [copiedId, setCopiedId] = createSignal<string | null>(null)

  useKeyboard((evt) => {
    if (evt.name === "escape" || evt.name === "q") {
      dialog.clear()
    }
    if (evt.name === "c" && evt.ctrl) {
      copyAllErrors()
    }
  })

  const copyError = async (error: {
    id: string
    message: string
    stack?: string
    source?: string
    timestamp: number
  }) => {
    const text = formatError(error)
    await Clipboard.copy(text)
    setCopiedId(error.id)
    toast.show({ message: "Error copied to clipboard", variant: "info", duration: 2000 })
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyAllErrors = async () => {
    if (errorLog.errors.length === 0) return
    const text = errorLog.errors.map(formatError).join("\n\n---\n\n")
    await Clipboard.copy(text)
    toast.show({ message: "All errors copied to clipboard", variant: "info", duration: 2000 })
  }

  const clearErrors = () => {
    errorLog.clear()
    toast.show({ message: "Error log cleared", variant: "info", duration: 2000 })
  }

  return (
    <box flexDirection="column" height={dimensions().height - 4}>
      <box flexDirection="row" justifyContent="space-between" alignItems="center" paddingBottom={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Error Log ({errorLog.count})
        </text>
        <box flexDirection="row" gap={2}>
          <Show when={errorLog.count > 0}>
            <box
              backgroundColor={theme.primary}
              paddingLeft={2}
              paddingRight={2}
              paddingTop={1}
              onMouseUp={copyAllErrors}
            >
              <text fg={theme.selectedListItemText}>Copy All (ctrl+c)</text>
            </box>
            <box backgroundColor={theme.error} paddingLeft={2} paddingRight={2} paddingTop={1} onMouseUp={clearErrors}>
              <text fg={theme.selectedListItemText}>Clear</text>
            </box>
          </Show>
          <box
            backgroundColor={theme.backgroundPanel}
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            onMouseUp={() => dialog.clear()}
          >
            <text fg={theme.text}>Close (esc)</text>
          </box>
        </box>
      </box>

      <Show
        when={errorLog.count > 0}
        fallback={
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.textMuted}>No errors logged</text>
          </box>
        }
      >
        <box flexDirection="column" flexGrow={1} gap={1} overflow="scroll">
          <For each={errorLog.errors}>
            {(error) => (
              <box
                flexDirection="column"
                backgroundColor={theme.backgroundPanel}
                border={["left"]}
                borderColor={theme.error}
                padding={1}
                gap={1}
              >
                <box flexDirection="row" justifyContent="space-between" alignItems="center">
                  <box flexDirection="row" gap={1}>
                    <Show when={error.source}>
                      <text fg={theme.textMuted}>[{error.source}]</text>
                    </Show>
                    <text fg={theme.textMuted}>{Locale.time(error.timestamp)}</text>
                  </box>
                  <box
                    backgroundColor={copiedId() === error.id ? theme.success : theme.primary}
                    paddingLeft={2}
                    paddingRight={2}
                    onMouseUp={() => copyError(error)}
                  >
                    <text fg={theme.selectedListItemText}>{copiedId() === error.id ? "Copied!" : "Copy"}</text>
                  </box>
                </box>
                <text fg={theme.error} wrapMode="word">
                  {error.message}
                </text>
                <Show when={error.stack}>
                  <box border={["top"]} borderColor={theme.background} paddingTop={1}>
                    <text fg={theme.textMuted} wrapMode="word">
                      {error.stack}
                    </text>
                  </box>
                </Show>
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  )
}

function formatError(error: { message: string; stack?: string; source?: string; timestamp: number }): string {
  const lines = [`[${new Date(error.timestamp).toISOString()}]${error.source ? ` [${error.source}]` : ""}`]
  lines.push(error.message)
  if (error.stack) {
    lines.push("")
    lines.push(error.stack)
  }
  return lines.join("\n")
}
