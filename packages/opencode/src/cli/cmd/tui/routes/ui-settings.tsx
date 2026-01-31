import { createSignal, createMemo, For, Show } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useLayout, type PanelType } from "@tui/context/layout"
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

  const safeDimensions = createMemo(() => {
    const dims = dimensions()
    return {
      width: dims?.width ?? 80,
      height: dims?.height ?? 24,
    }
  })

  // Preview dimensions: match terminal aspect ratio exactly
  const previewDimensions = createMemo(() => {
    const termWidth = safeDimensions().width - 4 // Account for padding
    const termHeight = safeDimensions().height - 8 // Account for header/footer

    // Use 60% of available space for preview to leave room for controls
    const maxWidth = Math.floor(termWidth * 0.6)
    const maxHeight = Math.floor(termHeight * 0.6)

    // Calculate aspect ratio of terminal
    const aspectRatio = termWidth / termHeight

    // Calculate preview dimensions maintaining exact aspect ratio
    let previewWidth = maxWidth
    let previewHeight = Math.floor(previewWidth / aspectRatio)

    // If height exceeds max, scale down proportionally
    if (previewHeight > maxHeight) {
      previewHeight = maxHeight
      previewWidth = Math.floor(previewHeight * aspectRatio)
    }

    // Ensure minimum dimensions
    previewWidth = Math.max(30, previewWidth)
    previewHeight = Math.max(8, previewHeight)

    return { width: previewWidth, height: previewHeight }
  })

  // Get visible panels sorted by position for layout preview
  const visiblePanels = createMemo(() => layout.panels.filter((p) => p.visible).sort((a, b) => a.position - b.position))

  // Calculate proportional width for each visible panel in the preview
  const getPanelPreviewWidth = (panel: { visible: boolean; width: number }) => {
    if (!panel.visible) return 0
    const totalVisibleWidth = visiblePanels().reduce((sum, p) => sum + p.width, 0)
    if (totalVisibleWidth === 0) return 0
    // Proportional width based on visible panels only
    return Math.floor((previewDimensions().width * panel.width) / totalVisibleWidth)
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

  // Handle width adjustment with +/- buttons - transfers width between adjacent panels
  const adjustWidth = (type: PanelType, direction: "minus" | "plus") => {
    const panel = layout.getPanelByType(type)
    if (!panel || !panel.visible) return

    // Find adjacent visible panels
    const sortedVisible = layout.panels.filter((p) => p.visible).sort((a, b) => a.position - b.position)
    const panelIndex = sortedVisible.findIndex((p) => p.type === type)

    if (panelIndex === -1) return

    if (direction === "minus") {
      // Decreasing: give space to the panel on the right (if exists), otherwise left
      const recipientIndex = panelIndex < sortedVisible.length - 1 ? panelIndex + 1 : panelIndex - 1
      if (recipientIndex < 0 || recipientIndex >= sortedVisible.length) return

      const recipient = sortedVisible[recipientIndex]
      const canDecrease = panel.width - 5 >= WIDTH_STEP
      const canReceive = recipient.width + WIDTH_STEP <= 90

      if (canDecrease && canReceive) {
        layout.setPanelWidth(type, panel.width - WIDTH_STEP)
        layout.setPanelWidth(recipient.type, recipient.width + WIDTH_STEP)
      }
    } else {
      // Increasing: take space from the panel on the right (if exists), otherwise left
      const donorIndex = panelIndex < sortedVisible.length - 1 ? panelIndex + 1 : panelIndex - 1
      if (donorIndex < 0 || donorIndex >= sortedVisible.length) return

      const donor = sortedVisible[donorIndex]
      const canIncrease = panel.width + WIDTH_STEP <= 90
      const canGive = donor.width - 5 >= WIDTH_STEP

      if (canIncrease && canGive) {
        layout.setPanelWidth(type, panel.width + WIDTH_STEP)
        layout.setPanelWidth(donor.type, donor.width - WIDTH_STEP)
      }
    }
  }

  const totalPercent = createMemo(() => layout.panels.reduce((sum, p) => sum + (p.visible ? p.width : 0), 0))

  const isLayoutValid = createMemo(() => totalPercent() === 100)

  const handleReturn = () => {
    // Only allow exit if layout totals exactly 100%
    if (!isLayoutValid()) return

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
          <text
            fg={isLayoutValid() ? theme.primary : theme.textMuted}
            attributes={isLayoutValid() ? TextAttributes.BOLD : undefined}
            onMouseUp={handleReturn}
          >
            {isLayoutValid() ? "[Done]" : "[Done] (needs 100%)"}
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
          Click panels to select and swap positions. Use +/- to adjust widths. Toggle visibility below.
        </text>
      </box>

      {/* Layout Preview */}
      <box
        flexShrink={0}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        flexDirection="column"
        gap={1}
      >
        <box
          width={previewDimensions().width}
          height={previewDimensions().height}
          flexDirection="row"
          border={["left", "right", "top", "bottom"]}
          borderColor={theme.border}
          padding={0}
          gap={0}
        >
          <For each={visiblePanels()}>
            {(panel) => {
              const isSelected = createMemo(() => selectedPanel() === panel.type)
              const canSwapHere = createMemo(() => {
                const selected = selectedPanel()
                if (!selected) return false
                const selectedPanelObj = layout.getPanelByType(selected)
                return selectedPanelObj && selectedPanelObj.position !== panel.position
              })
              const width = createMemo(() => getPanelPreviewWidth(panel))

              return (
                <box
                  width={width()}
                  height="100%"
                  backgroundColor={getPanelColor(panel.type, isSelected() ? 0.7 : 1.0)}
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
                  onMouseUp={() => handlePanelClick(panel.type)}
                >
                  {/* Panel Header */}
                  <box
                    paddingLeft={1}
                    paddingRight={1}
                    paddingTop={0}
                    paddingBottom={0}
                    backgroundColor={theme.background}
                  >
                    <text fg={getPanelColor(panel.type, 1.0)} attributes={TextAttributes.BOLD}>
                      {PANEL_NAMES[panel.type]}
                    </text>
                  </box>

                  {/* Description */}
                  <text fg={theme.text}>{PANEL_DESC[panel.type]}</text>

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

                  {/* Hide button */}
                  <box
                    marginTop={2}
                    paddingLeft={2}
                    paddingRight={2}
                    paddingTop={0}
                    paddingBottom={0}
                    backgroundColor={theme.backgroundElement}
                    onMouseUp={(e) => {
                      e.stopPropagation()
                      layout.togglePanel(panel.type)
                    }}
                  >
                    <text fg={theme.textMuted}>[Hide]</text>
                  </box>
                </box>
              )
            }}
          </For>

          {/* Show hidden panels as thin collapsed strips */}
          <For each={layout.panels.filter((p) => !p.visible)}>
            {(panel) => {
              const isSelected = createMemo(() => selectedPanel() === panel.type)

              return (
                <box
                  width={3}
                  height="100%"
                  backgroundColor={theme.backgroundElement}
                  border={isSelected() ? ["left", "right", "top", "bottom"] : ["left"]}
                  borderColor={isSelected() ? theme.warning : theme.border}
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  onMouseUp={() => {
                    // Clicking hidden panel while another is selected just deselects
                    if (selectedPanel()) {
                      setSelectedPanel(null)
                    }
                  }}
                >
                  {/* Vertical text for hidden panel */}
                  <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>
                    {PANEL_NAMES[panel.type][0]}
                  </text>
                  <Show when={isSelected()}>
                    <box marginTop={1} backgroundColor={theme.warning}>
                      <text fg={theme.background}>!</text>
                    </box>
                  </Show>
                </box>
              )
            }}
          </For>
        </box>

        {/* Legend with Visibility Toggles - One panel per line */}
        <box flexDirection="column" gap={1} paddingTop={1} paddingLeft={1} paddingRight={1}>
          <For each={layout.panels}>
            {(panel) => (
              <box flexDirection="row" gap={2} alignItems="center">
                {/* Panel header */}
                <box flexDirection="row" gap={1} alignItems="center" width={16}>
                  <box width={3} height={1} backgroundColor={getPanelColor(panel.type, 1.0)} />
                  <text fg={theme.text}>{PANEL_NAMES[panel.type]}</text>
                </box>

                {/* Visibility toggle */}
                <box
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={panel.visible ? theme.success : theme.backgroundElement}
                  onMouseUp={() => layout.togglePanel(panel.type)}
                >
                  <text fg={panel.visible ? theme.background : theme.textMuted}>
                    {panel.visible ? "[show]" : "[hide]"}
                  </text>
                </box>

                {/* Width controls with +/- (only for visible panels) */}
                <Show when={panel.visible}>
                  <box flexDirection="row" gap={1} alignItems="center">
                    <text
                      fg={theme.primary}
                      onMouseUp={(e) => {
                        e.stopPropagation()
                        adjustWidth(panel.type, "minus")
                      }}
                    >
                      [-]
                    </text>
                    <text
                      fg={theme.primary}
                      onMouseUp={(e) => {
                        e.stopPropagation()
                        adjustWidth(panel.type, "plus")
                      }}
                    >
                      [+]
                    </text>
                  </box>
                </Show>
              </box>
            )}
          </For>
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
        <text fg={theme.textMuted}>Click panels to swap. [Done] to apply. ESC to cancel.</text>
        <text fg={theme.textMuted}>
          Total: {Math.round(layout.panels.reduce((sum, p) => sum + (p.visible ? p.width : 0), 0))}%
        </text>
      </box>
    </box>
  )
}
