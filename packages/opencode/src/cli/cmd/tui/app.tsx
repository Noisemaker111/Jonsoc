import fs from "fs"
import { render, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid"
import { Clipboard } from "@tui/util/clipboard"
import { TextAttributes } from "@opentui/core"
import { RouteProvider, useRoute } from "@tui/context/route"
import {
  Switch,
  Match,
  createEffect,
  untrack,
  ErrorBoundary,
  createSignal,
  onMount,
  batch,
  Show,
  on,
  For,
} from "solid-js"
import { Installation } from "@/installation"
import { Flag } from "@/flag/flag"
import { DialogProvider, useDialog } from "@tui/ui/dialog"
import { DialogProvider as DialogProviderList } from "@tui/component/dialog-provider"
import { SDKProvider, useSDK } from "@tui/context/sdk"
import { SyncProvider, useSync } from "@tui/context/sync"
import { LocalProvider, useLocal } from "@tui/context/local"
import { DialogModel, useConnected } from "@tui/component/dialog-model"
import { DialogMcp } from "@tui/component/dialog-mcp"
import { DialogStatus } from "@tui/component/dialog-status"
import { DialogThemeList } from "@tui/component/dialog-theme-list"
import { DialogHelp } from "./ui/dialog-help"
import { CommandProvider, useCommandDialog } from "@tui/component/dialog-command"
import { DialogAgent } from "@tui/component/dialog-agent"
import { DialogSessionList } from "@tui/component/dialog-session-list"
import { KeybindProvider } from "@tui/context/keybind"
import { ThemeProvider, useTheme } from "@tui/context/theme"
import { Home } from "@tui/routes/home"
import { Session } from "@tui/routes/session"
import { UISettings } from "@tui/routes/ui-settings"
import { LayoutProvider } from "@tui/context/layout"
import { PromptHistoryProvider } from "./component/prompt/history"
import { FrecencyProvider } from "./component/prompt/frecency"
import { PromptStashProvider } from "./component/prompt/stash"
import { DialogAlert } from "./ui/dialog-alert"
import { ToastProvider, useToast } from "./ui/toast"
import { ExitProvider, useExit, EXIT_CODE_RESTART } from "./context/exit"
import { ErrorLogProvider, useErrorLog, init as initErrorLog, type ErrorEntry } from "./context/error-log"
import { DialogErrorLog } from "./component/dialog-error-log"
import { Session as SessionApi } from "@/session"
import { TuiEvent } from "./event"
import { KVProvider, useKV } from "./context/kv"
import { InspectorProvider } from "./context/inspector"
import { InspectorOverlay } from "./component/inspector-overlay"
import { Provider } from "@/provider/provider"
import { ArgsProvider, useArgs, type Args } from "./context/args"
import open from "open"
import { writeHeapSnapshot } from "v8"
import { PromptRefProvider, usePromptRef } from "./context/prompt"

async function getTerminalBackgroundColor(): Promise<"dark" | "light"> {
  // can't set raw mode if not a TTY
  if (!process.stdin.isTTY) return "dark"

  return new Promise((resolve) => {
    let timeout: NodeJS.Timeout

    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.removeListener("data", handler)
      clearTimeout(timeout)
    }

    const handler = (data: Buffer) => {
      const str = data.toString()
      const match = str.match(/\x1b]11;([^\x07\x1b]+)/)
      if (match) {
        cleanup()
        const color = match[1]
        // Parse RGB values from color string
        // Formats: rgb:RR/GG/BB or #RRGGBB or rgb(R,G,B)
        let r = 0,
          g = 0,
          b = 0

        if (color.startsWith("rgb:")) {
          const parts = color.substring(4).split("/")
          r = parseInt(parts[0], 16) >> 8 // Convert 16-bit to 8-bit
          g = parseInt(parts[1], 16) >> 8 // Convert 16-bit to 8-bit
          b = parseInt(parts[2], 16) >> 8 // Convert 16-bit to 8-bit
        } else if (color.startsWith("#")) {
          r = parseInt(color.substring(1, 3), 16)
          g = parseInt(color.substring(3, 5), 16)
          b = parseInt(color.substring(5, 7), 16)
        } else if (color.startsWith("rgb(")) {
          const parts = color.substring(4, color.length - 1).split(",")
          r = parseInt(parts[0])
          g = parseInt(parts[1])
          b = parseInt(parts[2])
        }

        // Calculate luminance using relative luminance formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

        // Determine if dark or light based on luminance threshold
        resolve(luminance > 0.5 ? "light" : "dark")
      }
    }

    process.stdin.setRawMode(true)
    process.stdin.on("data", handler)
    process.stdout.write("\x1b]11;?\x07")

    timeout = setTimeout(() => {
      cleanup()
      resolve("dark")
    }, 1000)
  })
}

import type { EventSource } from "./context/sdk"

export function tui(input: {
  url: string
  args: Args
  directory?: string
  fetch?: typeof fetch
  events?: EventSource
  onExit?: () => Promise<void>
}) {
  const errorLog = initErrorLog()

  const formatConsoleArg = (arg: unknown) => {
    if (typeof arg === "string") return arg
    if (arg instanceof Error) return arg.message
    return String(arg)
  }

  // Store original console functions
  const originalConsoleLog = console.log
  const originalConsoleError = console.error

  // Keep console errors visible for debugging
  console.log = (...args: unknown[]) => {
    originalConsoleLog(...args)
    const message = args.map(formatConsoleArg).join(" ")
    errorLog.add(message, "console")
  }

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args)
    const error = args.find((arg) => arg instanceof Error)
    const message = args.map(formatConsoleArg).join(" ")
    if (error) {
      const entry = new Error(message)
      if (error.stack) entry.stack = error.stack
      errorLog.add(entry, "console")
      return
    }
    errorLog.add(message, "console")
  }

  // Capture unhandled exceptions (suppress console output)
  process.on("uncaughtException", (error) => {
    errorLog.add(error, "uncaught")
    // Do NOT rethrow - suppress output
  })

  // Capture unhandled promise rejections (suppress console output)
  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    errorLog.add(error, "rejection")
    // Do NOT rethrow - suppress output
  })

  return new Promise<void>(async (resolve) => {
    const mode = await getTerminalBackgroundColor()
    const onExit = async () => {
      await input.onExit?.()
      resolve()
    }

    render(
      () => {
        return (
          <ErrorLogProvider value={errorLog}>
            <ErrorBoundary
              fallback={(error, reset) => <ErrorComponent error={error} reset={reset} onExit={onExit} mode={mode} />}
            >
              <ArgsProvider {...input.args}>
                <ExitProvider onExit={onExit}>
                  <KVProvider>
                    <LayoutProvider>
                      <ToastProvider>
                        <RouteProvider>
                          <SDKProvider
                            url={input.url}
                            directory={input.directory}
                            fetch={input.fetch}
                            events={input.events}
                          >
                            <SyncProvider>
                              <ThemeProvider mode={mode}>
                                <InspectorProvider>
                                  <LocalProvider>
                                    <KeybindProvider>
                                      <PromptStashProvider>
                                        <DialogProvider>
                                          <CommandProvider>
                                            <FrecencyProvider>
                                              <PromptHistoryProvider>
                                                <PromptRefProvider>
                                                  <App />
                                                </PromptRefProvider>
                                              </PromptHistoryProvider>
                                            </FrecencyProvider>
                                          </CommandProvider>
                                        </DialogProvider>
                                      </PromptStashProvider>
                                    </KeybindProvider>
                                  </LocalProvider>
                                </InspectorProvider>
                              </ThemeProvider>
                            </SyncProvider>
                          </SDKProvider>
                        </RouteProvider>
                      </ToastProvider>
                    </LayoutProvider>
                  </KVProvider>
                </ExitProvider>
              </ArgsProvider>
            </ErrorBoundary>
          </ErrorLogProvider>
        )
      },
      {
        targetFps: 60,
        gatherStats: false,
        exitOnCtrlC: false,
        useKittyKeyboard: {},
        // Console enabled for debugging
        useConsole: true,
        openConsoleOnError: true,
        consoleOptions: {
          keyBindings: [],
          onCopySelection: () => {},
        },
      },
    )
  })
}

function App() {
  const route = useRoute()
  const dimensions = useTerminalDimensions()
  const renderer = useRenderer()
  renderer.disableStdoutInterception()
  const dialog = useDialog()
  const local = useLocal()
  const kv = useKV()
  const command = useCommandDialog()
  const sdk = useSDK()
  const toast = useToast()
  const errorLog = useErrorLog()
  const { theme, mode, setMode } = useTheme()
  const sync = useSync()
  const exit = useExit()
  const promptRef = usePromptRef()

  // Wire up console copy-to-clipboard via opentui's onCopySelection callback
  renderer.console.onCopySelection = async (text: string) => {
    if (!text || text.length === 0) return

    await Clipboard.copy(text)
      .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
      .catch(toast.error)
    renderer.clearSelection()
  }
  const [terminalTitleEnabled, setTerminalTitleEnabled] = createSignal(kv.get("terminal_title_enabled", true))

  createEffect(() => {
    if (route.data.type !== "session") return
    kv.set("session_last", route.data.sessionID)
  })

  // Update terminal window title based on current route and session
  createEffect(() => {
    if (!terminalTitleEnabled() || Flag.OPENCODE_DISABLE_TERMINAL_TITLE) return

    if (route.data.type === "home") {
      renderer.setTerminalTitle("JonsOC")
      return
    }

    if (route.data.type === "session") {
      const session = sync.session.get(route.data.sessionID)
      if (!session || SessionApi.isDefaultTitle(session.title)) {
        renderer.setTerminalTitle("JonsOC")
        return
      }

      // Truncate title to 40 chars max
      const title = session.title.length > 40 ? session.title.slice(0, 37) + "..." : session.title
      renderer.setTerminalTitle(`JOC | ${title}`)
    }
  })

  const args = useArgs()

  createEffect(
    on(
      () => errorLog.count,
      (count, prev) => {
        if (prev === undefined) return
        if (count <= prev) return
        console.error("Error count changed:", count, prev)
        dialog.setSize("large")
        dialog.replace(() => <DialogErrorLog />)
      },
    ),
  )

  onMount(() => {
    batch(() => {
      if (args.agent) local.agent.set(args.agent)
      if (args.model) {
        const { providerID, modelID } = Provider.parseModel(args.model)
        if (!providerID || !modelID)
          return toast.show({
            variant: "warning",
            message: `Invalid model format: ${args.model}`,
            duration: 3000,
          })
        local.model.set({ providerID, modelID }, { recent: true })
      }
      if (args.sessionID) {
        route.navigate({
          type: "session",
          sessionID: args.sessionID,
        })
      }
    })
  })

  let continued = false
  createEffect(() => {
    // When using -c, session list is loaded in blocking phase, so we can navigate at "partial"
    if (continued || sync.status === "loading" || !args.continue) return
    const match = sync.data.session
      .toSorted((a, b) => b.time.updated - a.time.updated)
      .find((x) => x.parentID === undefined)?.id
    if (match) {
      continued = true
      route.navigate({ type: "session", sessionID: match })
    }
  })

  createEffect(
    on(
      () => sync.status === "complete" && sync.data.provider.length === 0,
      (isEmpty, wasEmpty) => {
        // only trigger when we transition into an empty-provider state
        if (!isEmpty || wasEmpty) return
        dialog.replace(() => <DialogProviderList />)
      },
    ),
  )

  const connected = useConnected()
  const docsUrl = process.env.JONSOC_DOCS_URL ?? process.env.OPENCODE_DOCS_URL ?? "https://opencode.ai/docs"
  const zenUrl = process.env.JONSOC_ZEN_URL ?? process.env.OPENCODE_ZEN_URL ?? "https://opencode.ai/zen"
  command.register(() => [
    {
      title: "Switch session",
      value: "session.list",
      keybind: "session_list",
      category: "Session",
      suggested: sync.data.session.length > 0,
      slash: {
        name: "sessions",
        aliases: ["resume", "continue"],
      },
      onSelect: () => {
        dialog.replace(() => <DialogSessionList />)
      },
    },
    {
      title: "New session",
      suggested: route.data.type === "session",
      value: "session.new",
      keybind: "session_new",
      category: "Session",
      slash: {
        name: "new",
        aliases: ["clear"],
      },
      onSelect: () => {
        const current = promptRef.current
        // Don't require focus - if there's any text, preserve it
        const currentPrompt = current?.current?.input ? current.current : undefined
        route.navigate({
          type: "home",
          initialPrompt: currentPrompt,
        })
        dialog.clear()
      },
    },
    {
      title: "Switch model",
      value: "model.list",
      keybind: "model_list",
      suggested: true,
      category: "Agent",
      slash: {
        name: "models",
      },
      onSelect: () => {
        dialog.replace(() => <DialogModel />)
      },
    },
    {
      title: "Model cycle",
      value: "model.cycle_recent",
      keybind: "model_cycle_recent",
      category: "Agent",
      hidden: true,
      onSelect: () => {
        local.model.cycle(1)
      },
    },
    {
      title: "Model cycle reverse",
      value: "model.cycle_recent_reverse",
      keybind: "model_cycle_recent_reverse",
      category: "Agent",
      hidden: true,
      onSelect: () => {
        local.model.cycle(-1)
      },
    },
    {
      title: "Favorite cycle",
      value: "model.cycle_favorite",
      keybind: "model_cycle_favorite",
      category: "Agent",
      hidden: true,
      onSelect: () => {
        local.model.cycleFavorite(1)
      },
    },
    {
      title: "Favorite cycle reverse",
      value: "model.cycle_favorite_reverse",
      keybind: "model_cycle_favorite_reverse",
      category: "Agent",
      hidden: true,
      onSelect: () => {
        local.model.cycleFavorite(-1)
      },
    },
    {
      title: "Switch agent",
      value: "agent.list",
      keybind: "agent_list",
      category: "Agent",
      slash: {
        name: "agents",
      },
      onSelect: () => {
        dialog.replace(() => <DialogAgent />)
      },
    },
    {
      title: "Toggle MCPs",
      value: "mcp.list",
      category: "Agent",
      slash: {
        name: "mcps",
      },
      onSelect: () => {
        dialog.replace(() => <DialogMcp />)
      },
    },
    {
      title: "Agent cycle",
      value: "agent.cycle",
      keybind: "agent_cycle",
      category: "Agent",
      hidden: true,
      onSelect: () => {
        local.agent.move(1)
      },
    },
    {
      title: "Variant cycle",
      value: "variant.cycle",
      keybind: "variant_cycle",
      category: "Agent",
      hidden: true,
      onSelect: () => {
        local.model.variant.cycle()
      },
    },
    {
      title: "Agent cycle reverse",
      value: "agent.cycle.reverse",
      keybind: "agent_cycle_reverse",
      category: "Agent",
      hidden: true,
      onSelect: () => {
        local.agent.move(-1)
      },
    },
    {
      title: "Connect provider",
      value: "provider.connect",
      suggested: !connected(),
      slash: {
        name: "connect",
      },
      onSelect: () => {
        dialog.replace(() => <DialogProviderList />)
      },
      category: "Provider",
    },
    {
      title: "View status",
      keybind: "status_view",
      value: "jonsoc.status",
      slash: {
        name: "status",
      },
      onSelect: () => {
        dialog.replace(() => <DialogStatus />)
      },
      category: "System",
    },
    {
      title: "Switch theme",
      value: "theme.switch",
      keybind: "theme_list",
      slash: {
        name: "themes",
      },
      onSelect: () => {
        dialog.replace(() => <DialogThemeList />)
      },
      category: "System",
    },
    {
      title: "Toggle appearance",
      value: "theme.switch_mode",
      onSelect: (dialog) => {
        setMode(mode() === "dark" ? "light" : "dark")
        dialog.clear()
      },
      category: "System",
    },
    {
      title: "Help",
      value: "help.show",
      slash: {
        name: "help",
      },
      onSelect: () => {
        dialog.replace(() => <DialogHelp />)
      },
      category: "System",
    },
    {
      title: "Open docs",
      value: "docs.open",
      onSelect: () => {
        open(docsUrl).catch(() => {})
        dialog.clear()
      },
      category: "System",
    },
    {
      title: "Open WebUI",
      value: "webui.open",
      onSelect: () => {
        open(sdk.url).catch(() => {})
        dialog.clear()
      },
      category: "System",
    },
    {
      title: "Exit the app",
      value: "app.exit",
      slash: {
        name: "exit",
        aliases: ["quit", "q"],
      },
      onSelect: () => exit(),
      category: "System",
    },
    {
      title: "Restart and resume session",
      value: "app.restart",
      slash: {
        name: "restart",
        aliases: ["reload"],
      },
      onSelect: () => exit(undefined, EXIT_CODE_RESTART),
      category: "System",
    },
    {
      title: "Toggle debug panel",
      category: "System",
      value: "app.debug",
      onSelect: (dialog) => {
        renderer.toggleDebugOverlay()
        dialog.clear()
      },
    },
    {
      title: "View error log",
      category: "System",
      value: "app.error_log",
      onSelect: (dialog) => {
        dialog.setSize("large")
        dialog.replace(() => <DialogErrorLog />)
      },
    },
    {
      title: "Write heap snapshot",
      category: "System",
      value: "app.heap_snapshot",
      onSelect: (dialog) => {
        const path = writeHeapSnapshot()
        toast.show({
          variant: "info",
          message: `Heap snapshot written to ${path}`,
          duration: 5000,
        })
        dialog.clear()
      },
    },
    {
      title: "Suspend terminal",
      value: "terminal.suspend",
      keybind: "terminal_suspend",
      category: "System",
      hidden: true,
      onSelect: () => {
        process.once("SIGCONT", () => {
          renderer.resume()
        })

        renderer.suspend()
        // pid=0 means send the signal to all processes in the process group
        process.kill(0, "SIGTSTP")
      },
    },
    {
      title: terminalTitleEnabled() ? "Disable terminal title" : "Enable terminal title",
      value: "terminal.title.toggle",
      keybind: "terminal_title_toggle",
      category: "System",
      onSelect: (dialog) => {
        setTerminalTitleEnabled((prev) => {
          const next = !prev
          kv.set("terminal_title_enabled", next)
          if (!next) renderer.setTerminalTitle("")
          return next
        })
        dialog.clear()
      },
    },
  ])

  createEffect(() => {
    const currentModel = local.model.current()
    if (!currentModel) return
    if (currentModel.providerID === "openrouter" && !kv.get("openrouter_warning", false)) {
      untrack(() => {
        DialogAlert.show(
          dialog,
          "Warning",
          `While openrouter is a convenient way to access LLMs your request will often be routed to subpar providers that do not work well in our testing.\n\nFor reliable access to models check out OpenCode Zen\n${zenUrl}`,
        ).then(() => kv.set("openrouter_warning", true))
      })
    }
  })

  sdk.event.on(TuiEvent.CommandExecute.type, (evt) => {
    command.trigger(evt.properties.command)
  })

  sdk.event.on(TuiEvent.ToastShow.type, (evt) => {
    toast.show({
      title: evt.properties.title,
      message: evt.properties.message,
      variant: evt.properties.variant,
      duration: evt.properties.duration,
    })
  })

  sdk.event.on(TuiEvent.SessionSelect.type, (evt) => {
    route.navigate({
      type: "session",
      sessionID: evt.properties.sessionID,
    })
  })

  sdk.event.on(SessionApi.Event.Deleted.type, (evt) => {
    if (route.data.type === "session" && route.data.sessionID === evt.properties.info.id) {
      route.navigate({ type: "home" })
      toast.show({
        variant: "info",
        message: "The current session was deleted",
      })
    }
  })

  sdk.event.on(SessionApi.Event.Error.type, (evt) => {
    const error = evt.properties.error
    if (error && typeof error === "object" && error.name === "MessageAbortedError") return
    const message = (() => {
      if (!error) return "An error occurred"

      if (typeof error === "object") {
        const data = error.data
        if ("message" in data && typeof data.message === "string") {
          return data.message
        }
      }
      return String(error)
    })()

    toast.show({
      variant: "error",
      message,
      duration: 5000,
    })
  })

  sdk.event.on(Installation.Event.UpdateAvailable.type, (evt) => {
    toast.show({
      variant: "info",
      title: "Update Available",
      message: `JonsOC v${evt.properties.version} is available. Run 'jonsoc upgrade' to update manually.`,
      duration: 10000,
    })
  })

  return (
    <box
      width={dimensions().width}
      height={dimensions().height}
      backgroundColor={theme.background}
      onMouseUp={async () => {
        if (Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT) {
          renderer.clearSelection()
          return
        }
        const text = renderer.getSelection()?.getSelectedText()
        if (text && text.length > 0) {
          await Clipboard.copy(text)
            .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
            .catch(toast.error)
          renderer.clearSelection()
        }
      }}
    >
      <Switch>
        <Match when={route.data.type === "home"}>
          <Home />
        </Match>
        <Match when={route.data.type === "session"}>
          <Session />
        </Match>
        <Match when={route.data.type === "ui-settings"}>
          <UISettings />
        </Match>
      </Switch>
      <InspectorOverlay />
    </box>
  )
}

function ErrorComponent(props: {
  error: Error
  reset: () => void
  onExit: () => Promise<void>
  mode?: "dark" | "light"
}) {
  const errorLog = useErrorLog()

  let term: ReturnType<typeof useTerminalDimensions> | null = null
  let renderer: ReturnType<typeof useRenderer> | null = null
  let hasRendererContext = false

  try {
    term = useTerminalDimensions()
    renderer = useRenderer()
    hasRendererContext = true
  } catch {
    // Renderer context not available - will use console fallback
  }

  // If no renderer context, log to file and exit
  if (!hasRendererContext) {
    const logEntry = `[${new Date().toISOString()}] Fatal error (renderer unavailable):\nMessage: ${props.error.message}\nStack: ${props.error.stack}\n\n`
    fs.appendFileSync("jonsoc-fatal.log", logEntry)
    console.error("Fatal error (renderer unavailable):")
    console.error(props.error.message)
    console.error(props.error.stack)
    return null
  }

  const handleExit = async () => {
    if (renderer) {
      renderer.setTerminalTitle("")
      renderer.destroy()
    }
    props.onExit()
  }

  try {
    useKeyboard((evt) => {
      if (evt.ctrl && evt.name === "c") {
        handleExit()
      }
    })
  } catch {
    // Keyboard context not available - will exit without handler
  }
  const [copied, setCopied] = createSignal(false)
  const [showLog, setShowLog] = createSignal(false)

  const repo = (process.env.JONSOC_REPO ?? process.env.OPENCODE_REPO ?? "anomalyco/opencode").replace(
    /^https?:\/\/github\.com\//,
    "",
  )
  const issueURL = new URL(`https://github.com/${repo}/issues/new?template=bug-report.yml`)

  // Choose safe fallback colors per mode since theme context may not be available
  const isLight = props.mode === "light"
  const colors = {
    bg: isLight ? "#ffffff" : "#0a0a0a",
    text: isLight ? "#1a1a1a" : "#eeeeee",
    muted: isLight ? "#8a8a8a" : "#808080",
    primary: isLight ? "#3b7dd8" : "#fab283",
    error: isLight ? "#d32f2f" : "#f44336",
  }

  if (props.error.message) {
    issueURL.searchParams.set("title", `opentui: fatal: ${props.error.message}`)
  }

  if (props.error.stack) {
    issueURL.searchParams.set(
      "description",
      "```\n" + props.error.stack.substring(0, 6000 - issueURL.toString().length) + "...\n```",
    )
  }

  issueURL.searchParams.set("jonsoc-version", Installation.VERSION)

  const copyIssueURL = () => {
    Clipboard.copy(issueURL.toString()).then(() => {
      setCopied(true)
    })
  }

  const termWidth = term?.().width ?? 80
  const termHeight = term?.().height ?? 24

  return (
    <box flexDirection="column" gap={1} backgroundColor={colors.bg} width={termWidth} height={termHeight}>
      <box flexDirection="row" gap={1} alignItems="center">
        <text attributes={TextAttributes.BOLD} fg={colors.text}>
          Please report an issue.
        </text>
        <box onMouseUp={copyIssueURL} backgroundColor={colors.primary} padding={1}>
          <text attributes={TextAttributes.BOLD} fg={colors.bg}>
            Copy issue URL (exception info pre-filled)
          </text>
        </box>
        {copied() && <text fg={colors.muted}>Successfully copied</text>}
      </box>
      <box flexDirection="row" gap={2} alignItems="center">
        <text fg={colors.text}>A fatal error occurred!</text>
        <box onMouseUp={props.reset} backgroundColor={colors.primary} padding={1}>
          <text fg={colors.bg}>Reset TUI</text>
        </box>
        <box onMouseUp={handleExit} backgroundColor={colors.primary} padding={1}>
          <text fg={colors.bg}>Exit</text>
        </box>
        <box onMouseUp={() => setShowLog(!showLog())} backgroundColor={colors.primary} padding={1}>
          <text fg={colors.bg}>{showLog() ? "Show Fatal Error" : `Show Error Log (${errorLog.count})`}</text>
        </box>
      </box>
      <Show
        when={showLog()}
        fallback={
          <>
            <scrollbox height={Math.floor(termHeight * 0.7)}>
              <text fg={colors.muted}>{props.error.stack}</text>
            </scrollbox>
            <text fg={colors.text}>{props.error.message}</text>
          </>
        }
      >
        <scrollbox height={Math.floor(termHeight * 0.7)}>
          <For each={errorLog.errors}>
            {(error: ErrorEntry) => (
              <box flexDirection="column" border={["bottom"]} borderColor={colors.muted} paddingBottom={1} gap={1}>
                <text fg={colors.primary}>
                  [{error.source ?? "unknown"}] {new Date(error.timestamp).toLocaleTimeString()}
                </text>
                <text fg={colors.error}>{error.message}</text>
                <Show when={error.stack}>
                  <text fg={colors.muted}>{error.stack}</text>
                </Show>
              </box>
            )}
          </For>
        </scrollbox>
      </Show>
    </box>
  )
}
