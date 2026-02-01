import { createMemo, For, Show } from "solid-js"
import { useLayout, type PanelType, type PanelPosition } from "@tui/context/layout"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import type { JSX } from "solid-js"

interface DynamicLayoutProps {
  chat: JSX.Element
  explorer: JSX.Element
  viewer: JSX.Element
}

export function DynamicLayout(props: DynamicLayoutProps) {
  const layout = useLayout()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()

  const totalWidth = createMemo(() => {
    const dims = dimensions()
    return dims?.width ? dims.width - 4 : 80
  })

  const getPanelWidth = (position: PanelPosition) => {
    const panel = layout.getPanelAt(position)
    if (!panel || !panel.visible) return 0
    const total = totalWidth()

    // Calculate total width of all visible panels for normalization
    const visiblePanels = layout.panels.filter((p) => p.visible)
    const totalVisibleWidth = visiblePanels.reduce((sum, p) => sum + p.width, 0)

    // Normalize width so visible panels fill 100% of available space
    if (totalVisibleWidth === 0) return 0
    const normalizedWidth = (panel.width / totalVisibleWidth) * 100
    return Math.floor((total * normalizedWidth) / 100)
  }

  const getPanelContent = (type: PanelType) => {
    switch (type) {
      case "chat":
        return props.chat
      case "explorer":
        return props.explorer
      case "viewer":
        return props.viewer
    }
  }

  const safeDimensions = createMemo(() => {
    const dims = dimensions()
    return {
      width: dims?.width ?? 80,
      height: dims?.height ?? 24,
    }
  })

  return (
    <box width={safeDimensions().width} height={safeDimensions().height} flexDirection="row">
      <For each={[0, 1, 2]}>
        {(position) => {
          const panel = createMemo(() => layout.getPanelAt(position as PanelPosition))
          const width = createMemo(() => getPanelWidth(position as PanelPosition))

          return (
            <>
              {/* Thin border between panels using line character */}
              <Show
                when={position > 0 && layout.getPanelAt((position - 1) as PanelPosition)?.visible && panel()?.visible}
              >
                <box width={1} height="100%">
                  <text fg={theme.border}>{"│\n".repeat(safeDimensions().height)}</text>
                </box>
              </Show>

              <Show when={panel()?.visible}>
                <box width={width()} height="100%">
                  {getPanelContent(panel()!.type)}
                </box>
              </Show>
            </>
          )
        }}
      </For>
    </box>
  )
}
