import { Prompt, type PromptRef } from "@tui/component/prompt"
import { type MouseEvent } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { batch, createEffect, createMemo, createSignal, Match, onMount, Show, Switch } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useKeybind } from "@tui/context/keybind"
import { Logo } from "../component/logo"
import { Tips } from "../component/tips"
import { Locale } from "@/util/locale"
import { useSync } from "../context/sync"
import { Toast, useToast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useDirectory } from "../context/directory"
import { useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { Installation } from "@/installation"
import { useKV } from "../context/kv"
import { useCommandDialog } from "../component/dialog-command"
import { Navigator } from "./session/navigator"

// TODO: what is the best way to do this?
let once = false

export function Home() {
  const sync = useSync()
  const kv = useKV()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
  const toast = useToast()
  const mcp = createMemo(() => Object.keys(sync.data.mcp).length > 0)
  const mcpError = createMemo(() => {
    return Object.values(sync.data.mcp).some((x) => x.status === "failed")
  })

  const connectedMcpCount = createMemo(() => {
    return Object.values(sync.data.mcp).filter((x) => x.status === "connected").length
  })

  const isFirstTimeUser = createMemo(() => sync.data.session.length === 0)
  const tipsHidden = createMemo(() => kv.get("tips_hidden", false))
  const showTips = createMemo(() => {
    // Don't show tips for first-time users
    if (isFirstTimeUser()) return false
    return !tipsHidden()
  })

  const dimensions = useTerminalDimensions()
  type NavigatorState = "open" | "closed"
  const [navigatorState, setNavigatorState] = createSignal<NavigatorState>(
    kv.get("navigator_open", false) ? "open" : "closed",
  )
  const [navigatorPinned, setNavigatorPinned] = kv.signal("navigator_pinned", false)
  const [navigatorAlwaysOpen, setNavigatorAlwaysOpen] = kv.signal("navigator_always_open", false)
  const [navigatorTab, setNavigatorTab] = kv.signal<"explorer" | "git">("navigator_tab", "explorer")
  const [navigatorSide, setNavigatorSide] = kv.signal<"left" | "right">("navigator_side", "left")
  const [navigatorRatio, setNavigatorRatio] = kv.signal("navigator_width_ratio", 0.45)
  const navigatorWidth = createMemo(() => {
    const min = 36
    const max = Math.min(96, Math.floor(dimensions().width * 0.6))
    const next = Math.floor(dimensions().width * navigatorRatio())
    return Math.min(max, Math.max(min, next))
  })
  const navigatorOpen = createMemo(() => navigatorState() === "open")
  const navigatorVisible = createMemo(() => navigatorOpen() || navigatorPinned() || navigatorAlwaysOpen())
  const navigatorSideValue = createMemo<"left" | "right">(() => (navigatorSide() === "right" ? "right" : "left"))
  const navigatorSideNext = createMemo(() => (navigatorSideValue() === "left" ? "right" : "left"))
  const navigatorRowDirection = createMemo<"row" | "row-reverse">(() =>
    navigatorSideValue() === "left" ? "row" : "row-reverse",
  )
  const navigatorDisplayWidth = createMemo(() => (navigatorVisible() ? navigatorWidth() : 0))
  const [navigatorDragging, setNavigatorDragging] = createSignal(false)
  const clampRatio = (value: number) => Math.min(0.6, Math.max(0.2, value))
  const updateNavigatorRatio = (event: MouseEvent) => {
    if (!navigatorDragging()) return
    const width = dimensions().width
    if (width <= 0) return
    const ratio = navigatorSideValue() === "left" ? event.x / width : (width - event.x) / width
    const next = clampRatio(ratio)
    setNavigatorRatio(() => next)
  }

  createEffect(() => {
    if (navigatorAlwaysOpen()) {
      if (navigatorState() !== "open") setNavigatorState("open")
      return
    }
    if (!navigatorPinned()) return
    if (navigatorOpen()) return
    setNavigatorState("open")
  })

  createEffect(() => {
    const side = navigatorSide()
    if (side === "left") return
    if (side === "right") return
    setNavigatorSide(() => "left")
  })

  const closeNavigator = () => {
    if (navigatorAlwaysOpen()) return
    batch(() => {
      if (navigatorPinned()) setNavigatorPinned(() => false)
      setNavigatorState("closed")
    })
    promptRef.current?.focus()
  }

  const toggleNavigator = () => {
    if (navigatorVisible()) {
      closeNavigator()
      return
    }
    const focused = promptRef.current?.focused
    setNavigatorState("open")
    if (focused) queueMicrotask(() => promptRef.current?.focus())
  }

  const toggleNavigatorPinned = () => {
    if (navigatorPinned()) {
      setNavigatorPinned(() => false)
      return
    }
    const focused = promptRef.current?.focused
    setNavigatorPinned(() => true)
    setNavigatorState("open")
    if (focused) queueMicrotask(() => promptRef.current?.focus())
  }

  const toggleNavigatorTab = () => {
    setNavigatorTab((prev) => (prev === "git" ? "explorer" : "git"))
  }

  const toggleNavigatorSide = () => {
    setNavigatorSide(() => navigatorSideNext())
  }

  command.register(() => [
    {
      title: tipsHidden() ? "Show tips" : "Hide tips",
      value: "tips.toggle",
      keybind: "tips_toggle",
      category: "System",
      onSelect: (dialog) => {
        kv.set("tips_hidden", !tipsHidden())
        dialog.clear()
      },
    },
    {
      title: navigatorVisible() ? "Hide navigator" : "Show navigator",
      value: "session.navigator.toggle",
      keybind: "navigator_toggle",
      category: "Session",
      onSelect: (dialog) => {
        toggleNavigator()
        dialog.clear()
      },
    },
    {
      title: navigatorPinned() ? "Unpin file viewer" : "Pin file viewer open",
      value: "session.navigator.pin",
      category: "Session",
      onSelect: (dialog) => {
        toggleNavigatorPinned()
        dialog.clear()
      },
    },
    {
      title: navigatorTab() === "git" ? "Keep file explorer on" : "Keep git controls on",
      value: "session.navigator.git.toggle",
      category: "Session",
      onSelect: (dialog) => {
        toggleNavigatorTab()
        dialog.clear()
      },
    },
    {
      title: navigatorSideNext() === "right" ? "Move navigator to right" : "Move navigator to left",
      value: "session.navigator.side",
      category: "Session",
      onSelect: (dialog) => {
        toggleNavigatorSide()
        dialog.clear()
      },
    },
    {
      title: navigatorAlwaysOpen() ? "Navigator: Always on" : "Navigator: Normal mode",
      value: "session.navigator.always_open",
      category: "Session",
      onSelect: (dialog) => {
        const value = !navigatorAlwaysOpen()
        setNavigatorAlwaysOpen(() => value)
        toast.show({
          message: value ? "Navigator always on" : "Navigator normal mode",
          variant: "success",
        })
        dialog.clear()
      },
    },
  ])

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
  const directory = useDirectory()

  const keybind = useKeybind()

  return (
    <box
      height="100%"
      flexDirection={navigatorRowDirection()}
      onMouseMove={updateNavigatorRatio}
      onMouseUp={() => setNavigatorDragging(false)}
    >
      <Navigator
        width={navigatorDisplayWidth()}
        onClose={closeNavigator}
        open={navigatorVisible()}
        side={navigatorSideValue()}
        promptRef={promptRef.current}
      />
      <box
        width={navigatorVisible() ? 1 : 0}
        backgroundColor={theme.border}
        onMouseDown={(event) => {
          setNavigatorDragging(true)
          updateNavigatorRatio(event)
        }}
        onMouseUp={() => setNavigatorDragging(false)}
      />
      <box flexGrow={1} flexDirection="column" onMouseUp={() => promptRef.current?.focus()}>
        <box flexGrow={1} justifyContent="center" alignItems="center" paddingLeft={2} paddingRight={2} gap={1}>
          <box height={3} />
          <Logo />
          <box width="100%" maxWidth={75} zIndex={1000} paddingTop={1}>
            <Prompt
              ref={(r) => {
                prompt = r
                promptRef.set(r)
              }}
              hint={Hint}
            />
          </box>
          <box height={3} width="100%" maxWidth={75} alignItems="center" paddingTop={2}>
            <Show when={showTips()}>
              <Tips />
            </Show>
          </box>
          <Toast />
        </box>
        <box
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
          flexDirection="row"
          flexShrink={0}
          gap={2}
        >
          <text fg={theme.textMuted}>{directory()}</text>
          <box gap={1} flexDirection="row" flexShrink={0}>
            <Show when={mcp()}>
              <text fg={theme.text}>
                <Switch>
                  <Match when={mcpError()}>
                    <span style={{ fg: theme.error }}>⊙ </span>
                  </Match>
                  <Match when={true}>
                    <span style={{ fg: connectedMcpCount() > 0 ? theme.success : theme.textMuted }}>⊙ </span>
                  </Match>
                </Switch>
                {connectedMcpCount()} MCP
              </text>
              <text fg={theme.textMuted}>/status</text>
            </Show>
          </box>
          <box flexGrow={1} />
          <box flexShrink={0}>
            <text fg={theme.textMuted}>{Installation.VERSION}</text>
          </box>
        </box>
      </box>
    </box>
  )
}
