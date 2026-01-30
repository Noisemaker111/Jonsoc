import { createSignal, createMemo, For, Show } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useLayout, type PanelType, type PanelPosition } from "@tui/context/layout"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import { TextAttributes, RGBA } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"

const PANEL_COLORS: Record<PanelType, [number, number, number]> = {
  chat: [100, 200, 100],
  explorer: [255, 200, 100],
  viewer: [100, 150, 255],
}

function getPanelColor(type: PanelType, alpha: number): RGBA {
  const [r, g, b] = PANEL_COLORS[type]
  return RGBA.fromInts(r, g, b, Math.floor(alpha * 255))
}

const PANEL_NAMES: Record<PanelType, string> = {
  chat: "CHAT",
  explorer: "EXPLORER",
  viewer: "VIEWER",
}

const PANEL_DESC: Record<PanelType, string> = {
  chat: "Conversation & Prompt",
  explorer: "File Tree & Git Status",
  viewer: "File Editor & Preview",
}

export function UISettings() {
  const route = useRouteData("ui-settings")
  const { navigate } = useRoute()
  const layout = useLayout()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()

  // Click-to-swap state
  const [selectedPanel, setSelectedPanel] = createSignal<PanelType | null>(null)

  // Width adjustment step
  const WIDTH_STEP = 5

  // Calculate remaining percentage
  const remainingPercent = createMemo(() => {
    const used = layout.panels.reduce((sum, p) => sum + (p.visible ? p.width : 0), 0)
    return 100 - used
  })

  const safeDimensions = createMemo(() => {
    const dims = dimensions()
    return {
      width: dims?.width ?? 80,
      height: dims?.height ?? 24,
    }
  })

  const totalWidth = createMemo(() => safeDimensions().width - 4)

  const getPanelWidth = (position: PanelPosition) => {
    const panel = layout.getPanelAt(position)
    if (!panel || !panel.visible) return 0
    return Math.floor((totalWidth() * panel.width) / 100)
  }

  // Handle click-to-swap panel selection
  const handlePanelClick = (type: PanelType) => {
    const currentSelected = selectedPanel()

    if (currentSelected === null) {
      // First click - select this panel
      setSelectedPanel(type)
    } else if (currentSelected === type) {
      // Clicked same panel - deselect
      setSelectedPanel(null)
    } else {
      // Clicked different panel - swap them
      const panel1 = layout.getPanelByType(currentSelected)
      const panel2 = layout.getPanelByType(type)
      if (panel1 && panel2) {
        layout.swapPanels(panel1.position, panel2.position)
      }
      setSelectedPanel(null)
    }
  }

  // Handle width adjustment with +/- buttons
  const adjustWidth = (type: PanelType, direction: "minus" | "plus") => {
    const panel = layout.getPanelByType(type)
    if (!panel || !panel.visible) return

    const visiblePanels = layout.panels.filter((p) => p.visible && p.type !== type)
    if (visiblePanels.length === 0) return

    if (direction === "minus") {
      // Decrease this panel by STEP, distribute to others
      const newWidth = Math.max(5, panel.width - WIDTH_STEP)
      const released = panel.width - newWidth

      if (released > 0) {
        layout.setPanelWidth(type, newWidth)
        // Distribute released width evenly among other visible panels
        const perPanel = released / visiblePanels.length
        visiblePanels.forEach((p) => {
          layout.setPanelWidth(p.type, Math.min(90, p.width + perPanel))
        })
      }
    } else {
      // Increase this panel by STEP, take from others
      const needed = WIDTH_STEP
      const available = visiblePanels.reduce((sum, p) => sum + (p.width - 5), 0)

      if (available >= needed) {
        const newWidth = Math.min(90, panel.width + needed)
        const taken = newWidth - panel.width

        layout.setPanelWidth(type, newWidth)

        // Take from other panels proportionally
        let remainingToTake = taken
        visiblePanels.forEach((p, idx) => {
          if (remainingToTake <= 0) return
          const canTake = p.width - 5
          const takeAmount =
            idx === visiblePanels.length - 1
              ? remainingToTake
              : Math.min(canTake, (p.width / visiblePanels.reduce((s, vp) => s + vp.width, 0)) * taken)
          layout.setPanelWidth(p.type, Math.max(5, p.width - takeAmount))
          remainingToTake -= takeAmount
        })
      }
    }
  }

  const handleReturn = () => {
    if (route.returnTo) {
      navigate(route.returnTo)
    } else {
      navigate({ type: "home" })
    }
  }

  const handleReset = () => {
    layout.resetToDefault()
    setSelectedPanel(null)
  }

  useKeyboard((e) => {
    if (e.name === "escape") {
      setSelectedPanel(null)
      return
    }
  })

  return (
    <box
      width={safeDimensions().width}
      height={safeDimensions().height}
      flexDirection="column"
      backgroundColor={theme.background}
    >
      {/* Header */}
      <box
        flexShrink={0}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        border={["bottom"]}
        borderColor={theme.border}
      >
        <box flexDirection="row" gap={1} alignItems="center">
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Layout Configuration
          </text>
          <Show when={selectedPanel()}>
            <text fg={theme.warning}>(Selected: {PANEL_NAMES[selectedPanel()!]} - click another to swap)</text>
          </Show>
        </box>
        <box flexDirection="row" gap={3}>
          <text fg={theme.textMuted} onMouseUp={handleReset}>
            [Reset]
          </text>
          <text fg={theme.primary} attributes={TextAttributes.BOLD} onMouseUp={handleReturn}>
            [Done]
          </text>
        </box>
      </box>

      {/* Instructions */}
      <box
        flexShrink={0}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        backgroundColor={theme.backgroundPanel}
      >
        <text fg={theme.textMuted}>
          Drag or click panels to reposition. Click a panel to select, click another to swap. Use +/- to adjust widths.
          ESC to cancel.
        </text>
      </box>

      {/* Layout Preview */}
      <box
        flexGrow={1}
        paddingTop={2}
        paddingBottom={2}
        paddingLeft={2}
        paddingRight={2}
        flexDirection="column"
        gap={1}
      >
        <box
          flexGrow={1}
          flexDirection="row"
          border={["left", "right", "top", "bottom"]}
          borderColor={theme.border}
          padding={0}
          gap={0}
        >
          <For each={[0, 1, 2]}>
            {(position) => {
              const panel = createMemo(() => layout.getPanelAt(position as PanelPosition))
              const width = createMemo(() => getPanelWidth(position as PanelPosition))
              const isSelected = createMemo(() => selectedPanel() === panel()?.type)
              const canSwapHere = createMemo(() => {
                const selected = selectedPanel()
                if (!selected) return false
                const selectedPanelObj = layout.getPanelByType(selected)
                return selectedPanelObj && selectedPanelObj.position !== position
              })

              return (
                <>
                  {/* Panel */}
                  <Show
                    when={panel()?.visible}
                    fallback={
                      <box
                        width={width()}
                        height="100%"
                        backgroundColor={isSelected() ? theme.backgroundPanel : theme.backgroundElement}
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        gap={1}
                        onMouseUp={() => {
                          // Clicking hidden panel while another is selected just deselects
                          if (selectedPanel()) {
                            setSelectedPanel(null)
                          }
                        }}
                      >
                        <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>
                          {PANEL_NAMES[panel()?.type ?? "chat"]}
                        </text>
                        <text fg={theme.textMuted}>{panel()?.width ?? 0}%</text>
                        <Show when={isSelected()}>
                          <box marginTop={1} paddingLeft={1} paddingRight={1} backgroundColor={theme.warning}>
                            <text fg={theme.background} attributes={TextAttributes.BOLD}>
                              Can't swap with hidden
                            </text>
                          </box>
                        </Show>
                        <box
                          marginTop={1}
                          paddingLeft={2}
                          paddingRight={2}
                          paddingTop={0}
                          paddingBottom={0}
                          backgroundColor={theme.success}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            const type = panel()?.type
                            if (type) layout.togglePanel(type)
                          }}
                        >
                          <text fg={theme.background}>[Show]</text>
                        </box>
                      </box>
                    }
                  >
                    <box
                      width={width()}
                      height="100%"
                      backgroundColor={getPanelColor(panel()?.type ?? "chat", isSelected() ? 0.7 : 1.0)}
                      border={
                        isSelected()
                          ? ["left", "right", "top", "bottom"]
                          : canSwapHere()
                            ? ["left", "right", "top", "bottom"]
                            : []
                      }
                      borderColor={isSelected() ? theme.warning : canSwapHere() ? theme.success : theme.border}
                      flexDirection="column"
                      justifyContent="center"
                      alignItems="center"
                      gap={1}
                      onMouseUp={() => {
                        const type = panel()?.type
                        if (type) handlePanelClick(type)
                      }}
                    >
                      {/* Panel Header */}
                      <box
                        paddingLeft={1}
                        paddingRight={1}
                        paddingTop={0}
                        paddingBottom={0}
                        backgroundColor={theme.background}
                      >
                        <text fg={getPanelColor(panel()?.type ?? "chat", 1.0)} attributes={TextAttributes.BOLD}>
                          {PANEL_NAMES[panel()?.type ?? "chat"]}
                        </text>
                      </box>

                      {/* Description */}
                      <text fg={theme.text}>{PANEL_DESC[panel()?.type ?? "chat"]}</text>

                      {/* Width */}
                      <text fg={theme.textMuted}>{panel()?.width ?? 0}% width</text>

                      {/* Position indicator */}
                      <text fg={theme.textMuted}>Position {position + 1}</text>

                      {/* Selected indicator */}
                      <Show when={isSelected()}>
                        <box marginTop={1} paddingLeft={1} paddingRight={1} backgroundColor={theme.warning}>
                          <text fg={theme.background} attributes={TextAttributes.BOLD}>
                            Selected (click another to swap)
                          </text>
                        </box>
                      </Show>

                      {/* Swap hint */}
                      <Show when={canSwapHere() && !isSelected()}>
                        <box marginTop={1} paddingLeft={1} paddingRight={1} backgroundColor={theme.success}>
                          <text fg={theme.background} attributes={TextAttributes.BOLD}>
                            Click to swap
                          </text>
                        </box>
                      </Show>

                      {/* Controls */}
                      <box flexDirection="row" gap={2} marginTop={2}>
                        <box
                          paddingLeft={1}
                          paddingRight={1}
                          backgroundColor={theme.backgroundElement}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            const type = panel()?.type
                            if (type) layout.togglePanel(type)
                          }}
                        >
                          <text fg={theme.textMuted}>[Hide]</text>
                        </box>
                      </box>
                    </box>
                  </Show>
                </>
              )
            }}
          </For>
        </box>

        {/* Legend with +/- Controls */}
        <box flexDirection="row" gap={4} paddingTop={1} paddingLeft={1} alignItems="center">
          <For each={layout.panels}>
            {(panel) => (
              <box flexDirection="row" gap={1} alignItems="center">
                <box width={3} height={1} backgroundColor={getPanelColor(panel.type, 1.0)} />
                <text fg={theme.text}>{PANEL_NAMES[panel.type]}</text>
                <text fg={panel.visible ? theme.success : theme.error}>{panel.visible ? "●" : "○"}</text>

                <Show when={panel.visible}>
                  <box flexDirection="row" gap={0}>
                    <box
                      paddingLeft={1}
                      paddingRight={1}
                      backgroundColor={theme.backgroundElement}
                      onMouseUp={(e) => {
                        e.stopPropagation()
                        adjustWidth(panel.type, "minus")
                      }}
                    >
                      <text fg={theme.textMuted}>[-]</text>
                    </box>
                    <text fg={theme.textMuted} paddingLeft={1} paddingRight={1}>
                      {panel.width}%
                    </text>
                    <box
                      paddingLeft={1}
                      paddingRight={1}
                      backgroundColor={theme.backgroundElement}
                      onMouseUp={(e) => {
                        e.stopPropagation()
                        adjustWidth(panel.type, "plus")
                      }}
                    >
                      <text fg={theme.textMuted}>[+]</text>
                    </box>
                  </box>
                </Show>
                <Show when={!panel.visible}>
                  <text fg={theme.textMuted}>{panel.width}%</text>
                </Show>
              </box>
            )}
          </For>

          {/* Remaining percentage indicator */}
          <box flexDirection="row" gap={1} alignItems="center" marginLeft={2}>
            <text fg={theme.textMuted}>|</text>
            <text fg={remainingPercent() === 0 ? theme.success : theme.warning}>
              {remainingPercent() === 0 ? "✓" : "⚠"}
            </text>
            <text fg={theme.textMuted}>Remaining: {remainingPercent()}%</text>
          </box>
        </box>
      </box>

      {/* Footer */}
      <box
        flexShrink={0}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        border={["top"]}
        borderColor={theme.border}
        flexDirection="row"
        justifyContent="space-between"
      >
        <text fg={theme.textMuted}>Drag or click panels to swap. [Done] to apply. ESC to cancel.</text>
        <text fg={theme.textMuted}>Total: {layout.panels.reduce((sum, p) => sum + (p.visible ? p.width : 0), 0)}%</text>
      </box>
    </box>
  )
}
