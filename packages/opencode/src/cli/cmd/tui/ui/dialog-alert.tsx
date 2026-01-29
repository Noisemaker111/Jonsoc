import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog, type DialogContext } from "./dialog"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { Clipboard } from "../util/clipboard"
import { useToast } from "./toast"
import { createSignal } from "solid-js"

export type DialogAlertProps = {
  title: string
  message: string
  copyText?: string
  onConfirm?: () => void
}

export function DialogAlert(props: DialogAlertProps) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const toast = useToast()
  const [copied, setCopied] = createSignal(false)

  useKeyboard((evt) => {
    if (evt.name === "return") {
      props.onConfirm?.()
      dialog.clear()
    }
  })

  const handleCopy = async () => {
    const text = props.copyText || props.message
    await Clipboard.copy(text)
    setCopied(true)
    toast.show({ message: "Copied to clipboard", variant: "info", duration: 2000 })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} width={Math.min(dimensions().width - 4, 80)}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box paddingBottom={1} maxHeight={dimensions().height - 12} overflow="scroll">
        <text fg={theme.textMuted} wrapMode="word">
          {props.message}
        </text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1} gap={2} alignItems="center">
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={theme.backgroundElement}
          onMouseUp={handleCopy}
        >
          <text fg={theme.text}>{copied() ? "copied!" : "copy"}</text>
        </box>
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={theme.primary}
          onMouseUp={() => {
            props.onConfirm?.()
            dialog.clear()
          }}
        >
          <text fg={theme.selectedListItemText}>ok</text>
        </box>
      </box>
    </box>
  )
}

DialogAlert.show = (dialog: DialogContext, title: string, message: string, copyText?: string) => {
  return new Promise<void>((resolve) => {
    dialog.replace(
      () => (
        <DialogAlert
          title={title}
          message={message}
          copyText={copyText}
          onConfirm={() => resolve()}
        />
      ),
      () => resolve(),
    )
  })
}
