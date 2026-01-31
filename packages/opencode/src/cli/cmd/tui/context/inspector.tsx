import { useTerminalDimensions } from "@opentui/solid"
import { createEffect, createSignal } from "solid-js"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"

export type InspectorInfo = {
  element: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  padding?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  margin?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export type MousePos = {
  x: number
  y: number
}

export const { use: useInspector, provider: InspectorProvider } = createSimpleContext({
  name: "Inspector",
  init: () => {
    const kv = useKV()
    const dimensions = useTerminalDimensions()

    const [enabled, setEnabled] = createSignal(kv.get("inspector_enabled", false))
    const [hoveredInfo, setHoveredInfo] = createSignal<InspectorInfo | null>(null)
    const [mousePos, setMousePos] = createSignal<MousePos>({ x: 0, y: 0 })

    createEffect(() => {
      kv.set("inspector_enabled", enabled())
    })

    return {
      enabled,
      setEnabled,
      hoveredInfo,
      setHoveredInfo,
      mousePos,
      setMousePos,
      dimensions,
    }
  },
})
