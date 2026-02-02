import { Prompt, type PromptRef } from "@tui/component/prompt"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, createSignal, Match, onMount, Show, Switch } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { Locale } from "@/util/locale"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { Installation } from "@/installation"
import { ExplorerPanel } from "./session/panel-explorer"
import { FileViewerPanel } from "./session/panel-viewer"
import { DynamicLayout } from "@tui/component/dynamic-layout"
import { useLayout } from "@tui/context/layout"
import { useCommandRegistry } from "../hooks/use-command-registry"
import { NavigatorBorderChars } from "./session/navigator-ui"

// TODO: what is the best way to do this?
let once = false

export function Home() {
  const sync = useSync()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const layout = useLayout()
  const [selectedFilePath, setSelectedFilePath] = createSignal<string | null>(null)
  const mcpError = createMemo(() => {
    return Object.values(sync.data.mcp).some((x) => x.status === "failed")
  })

  const connectedMcpCount = createMemo(() => {
    return Object.values(sync.data.mcp).filter((x) => x.status === "connected").length
  })

  const dimensions = useTerminalDimensions()
  const narrow = createMemo(() => dimensions().width < 80)

  // Register commands through centralized registry
  useCommandRegistry({
    groups: ["layout", "system"],
    returnTo: { type: "home" },
  })

  const Hint = (
    <Show when={connectedMcpCount() > 0}>
      <box flexShrink={0} flexDirection="row" gap={1}>
        <text fg={theme.text}>
          <Switch>
            <Match when={mcpError()}>
              <span style={{ fg: theme.error }}>•</span> mcp errors{" "}
              <span style={{ fg: theme.textMuted }}>ctrl+x s</span>
            </Match>
            <Match when={true}>
              <span style={{ fg: theme.success }}>•</span>{" "}
              {Locale.pluralize(connectedMcpCount(), "{} mcp server", "{} mcp servers")}
            </Match>
          </Switch>
        </text>
      </box>
    </Show>
  )

  let prompt: PromptRef
  const args = useArgs()
  onMount(() => {
    if (once) return
    if (route.initialPrompt) {
      prompt.set(route.initialPrompt)
      once = true
    } else if (args.prompt) {
      prompt.set({ input: args.prompt, parts: [] })
      once = true
      prompt.submit()
    }
  })
  // Reactive panel widths that update when layout store changes
  const explorerWidth = createMemo(() => {
    const panel = layout.getPanelByType("explorer")
    if (!panel?.visible) return 0
    return Math.floor(dimensions().width * ((panel.width || 20) / 100))
  })

  const viewerWidth = createMemo(() => {
    const panel = layout.getPanelByType("viewer")
    if (!panel?.visible) return 0
    return Math.floor(dimensions().width * ((panel.width || 30) / 100))
  })

  return (
    <DynamicLayout
      explorer={
        <ExplorerPanel
          width={explorerWidth()}
          onSelect={(path, type) => {
            if (type === "file") {
              setSelectedFilePath(path)
            }
          }}
        />
      }
      chat={
        <box height="100%" paddingBottom={1} gap={1} onMouseUp={() => promptRef.current?.focus()}>
          <box
            paddingTop={1}
            paddingBottom={1}
            paddingLeft={2}
            paddingRight={2}
            border={["bottom"]}
            borderColor={theme.border}
            customBorderChars={NavigatorBorderChars}
            backgroundColor={theme.backgroundPanel}
            flexShrink={0}
          >
            <box flexDirection={narrow() ? "column" : "row"} justifyContent="space-between" gap={1}>
              <text fg={theme.text}>
                <span style={{ bold: true }}>Send a message to start a new session</span>
              </text>
              <text fg={theme.textMuted}>v{Installation.VERSION}</text>
            </box>
          </box>
          <box flexGrow={1} paddingLeft={2} paddingRight={2} />
          <box flexShrink={0} paddingLeft={2} paddingRight={2}>
            <Prompt
              ref={(r) => {
                prompt = r
                promptRef.set(r)
              }}
              hint={Hint}
            />
          </box>
          <Toast />
        </box>
      }
      viewer={<FileViewerPanel width={viewerWidth()} filePath={selectedFilePath()} />}
    />
  )
}
