import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"

export type PanelType = "chat" | "explorer" | "viewer"

export type PanelPosition = 0 | 1 | 2

export interface PanelConfig {
  type: PanelType
  position: PanelPosition
  width: number
  visible: boolean
}

export interface LayoutConfig {
  panels: PanelConfig[]
  version: number
}

// Round width to nearest 5% increment
const roundToFive = (width: number): number => {
  return Math.round(width / 5) * 5
}

const DEFAULT_LAYOUT: LayoutConfig = {
  version: 1,
  panels: [
    { type: "explorer", position: 0, width: 20, visible: true },
    { type: "chat", position: 1, width: 50, visible: true },
    { type: "viewer", position: 2, width: 30, visible: true },
  ],
}

const LAYOUT_VERSION = 1

export function validateLayout(layout: any): LayoutConfig {
  if (!layout || typeof layout !== "object") return DEFAULT_LAYOUT
  if (layout.version !== LAYOUT_VERSION) return DEFAULT_LAYOUT
  if (!Array.isArray(layout.panels)) return DEFAULT_LAYOUT

  const validPanels = layout.panels.filter(
    (p: any) =>
      p &&
      ["chat", "explorer", "viewer"].includes(p.type) &&
      [0, 1, 2].includes(p.position) &&
      typeof p.width === "number" &&
      typeof p.visible === "boolean",
  )

  if (validPanels.length !== 3) return DEFAULT_LAYOUT

  const positions = new Set(validPanels.map((p: PanelConfig) => p.position))
  if (positions.size !== 3) return DEFAULT_LAYOUT

  // Round all widths to nearest 5%
  const roundedPanels = validPanels.map((p: PanelConfig) => ({
    ...p,
    width: roundToFive(Math.max(5, Math.min(90, p.width))),
  }))

  return {
    version: LAYOUT_VERSION,
    panels: roundedPanels.sort((a: PanelConfig, b: PanelConfig) => a.position - b.position),
  }
}

export function createLayoutStore() {
  const kv = useKV()
  const stored = kv.get("ui_layout", DEFAULT_LAYOUT)
  const validated = validateLayout(stored)

  const [store, setStore] = createStore<LayoutConfig>(validated)

  const save = () => {
    console.log("[Layout] save - saving layout:", store)
    kv.set("ui_layout", { ...store })
  }

  const updatePanel = (type: PanelType, updates: Partial<Omit<PanelConfig, "type">>) => {
    console.log("[Layout] updatePanel - type:", type, "updates:", updates)
    setStore(
      "panels",
      (p) => p.type === type,
      (panel) => {
        const updated = { ...panel, ...updates }
        console.log("[Layout] updatePanel - updated panel:", updated)
        return updated
      },
    )
    save()
  }

  const movePanel = (type: PanelType, newPosition: PanelPosition) => {
    const currentPanel = store.panels.find((p) => p.type === type)
    if (!currentPanel || currentPanel.position === newPosition) return

    const otherPanel = store.panels.find((p) => p.position === newPosition)
    if (!otherPanel) return

    setStore("panels", (p) => p.type === type, "position", newPosition)
    setStore("panels", (p) => p.type === otherPanel.type, "position", currentPanel.position as PanelPosition)
    save()
  }

  const swapPanels = (pos1: PanelPosition, pos2: PanelPosition) => {
    const panel1 = store.panels.find((p) => p.position === pos1)
    const panel2 = store.panels.find((p) => p.position === pos2)
    if (!panel1 || !panel2) return

    setStore("panels", (p) => p.type === panel1.type, "position", pos2)
    setStore("panels", (p) => p.type === panel2.type, "position", pos1)
    save()
  }

  const setPanelWidth = (type: PanelType, width: number) => {
    const rounded = roundToFive(width)
    const clamped = Math.max(5, Math.min(90, rounded))
    console.log("[Layout] setPanelWidth - type:", type, "width:", width, "rounded:", rounded, "clamped:", clamped)
    updatePanel(type, { width: clamped })
  }

  const batchUpdateWidths = (updates: Array<{ type: PanelType; width: number }>) => {
    console.log("[Layout] batchUpdateWidths - updates:", updates)

    // Apply all updates to a copy of the panels
    const updatedPanels = store.panels.map((panel) => {
      const update = updates.find((u) => u.type === panel.type)
      if (update) {
        const rounded = roundToFive(update.width)
        const clamped = Math.max(5, Math.min(90, rounded))
        return { ...panel, width: clamped }
      }
      return panel
    })

    // Update the store with all changes at once
    setStore("panels", updatedPanels)
    save()
  }

  const togglePanel = (type: PanelType) => {
    const panel = store.panels.find((p) => p.type === type)
    if (!panel) return

    const newVisible = !panel.visible
    console.log("[Layout] togglePanel - type:", type, "visible:", newVisible)

    const updates: Array<{ type: PanelType; width: number }> = []

    if (!newVisible) {
      // Hiding panel: redistribute its width equally to other visible panels
      const otherVisible = store.panels.filter((p) => p.type !== type && p.visible)
      if (otherVisible.length > 0) {
        const widthToDistribute = panel.width
        const perPanel = widthToDistribute / otherVisible.length

        otherVisible.forEach((p, idx) => {
          // Last panel gets the remainder to ensure exact distribution
          const additionalWidth =
            idx === otherVisible.length - 1 ? widthToDistribute - perPanel * (otherVisible.length - 1) : perPanel
          const newWidth = roundToFive(Math.min(90, p.width + additionalWidth))
          updates.push({ type: p.type, width: newWidth })
        })
      }
    } else {
      // Showing panel: take width equally from other visible panels
      const otherVisible = store.panels.filter((p) => p.type !== type && p.visible)
      if (otherVisible.length > 0) {
        const widthNeeded = panel.width
        const availableWidth = otherVisible.reduce((sum, p) => sum + (p.width - 5), 0)

        if (availableWidth >= widthNeeded) {
          const perPanel = widthNeeded / otherVisible.length
          let remainingToTake = widthNeeded

          otherVisible.forEach((p, idx) => {
            if (remainingToTake <= 0) return
            const canTake = p.width - 5
            // Last panel takes the remainder
            const takeAmount = idx === otherVisible.length - 1 ? remainingToTake : Math.min(canTake, perPanel)
            const newWidth = roundToFive(Math.max(5, p.width - takeAmount))
            updates.push({ type: p.type, width: newWidth })
            remainingToTake -= takeAmount
          })
        } else {
          // Not enough space available, reduce this panel's width
          updates.push({ type, width: roundToFive(Math.max(5, Math.min(90, availableWidth))) })
        }
      }
    }

    // Apply all width updates atomically
    if (updates.length > 0) {
      batchUpdateWidths(updates)
    }

    updatePanel(type, { visible: newVisible })
  }

  const getPanelAt = (position: PanelPosition) => {
    // Access store.panels to create reactivity tracking
    const panels = store.panels
    return panels.find((p) => p.position === position)
  }

  const getPanelByType = (type: PanelType) => {
    // Access store.panels to create reactivity tracking
    const panels = store.panels
    return panels.find((p) => p.type === type)
  }

  const resetToDefault = () => {
    setStore(DEFAULT_LAYOUT)
    save()
  }

  return {
    get config() {
      return store
    },
    get panels() {
      return store.panels
    },
    updatePanel,
    movePanel,
    swapPanels,
    setPanelWidth,
    batchUpdateWidths,
    togglePanel,
    getPanelAt,
    getPanelByType,
    resetToDefault,
  }
}

export const { use: useLayout, provider: LayoutProvider } = createSimpleContext({
  name: "Layout",
  init: createLayoutStore,
})
