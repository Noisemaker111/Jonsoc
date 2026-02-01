import { useRenderer, useTerminalDimensions } from "@opentui/solid"
import { RGBA, type Renderable, ScrollBoxRenderable } from "@opentui/core"
import { createEffect, createMemo, Show, createSignal } from "solid-js"
import { useInspector } from "../context/inspector"
import { useTheme } from "../context/theme"
import { Clipboard } from "@tui/util/clipboard"
import { useToast } from "../ui/toast"

// Get absolute position
// renderable.x/y already recursively include all parent offsets and scroll translations
function getAbsolutePosition(renderable: Renderable): { x: number; y: number } {
  return { x: renderable.x, y: renderable.y }
}

// Check if point is inside renderable bounds
function isPointInside(renderable: Renderable, px: number, py: number): boolean {
  const pos = getAbsolutePosition(renderable)
  return px >= pos.x && px < pos.x + renderable.width && py >= pos.y && py < pos.y + renderable.height
}

// Find the topmost element at position (excluding the overlay itself)
function findElementAtPositionTree(root: Renderable, x: number, y: number, excludeId?: string): Renderable | null {
  let found: Renderable | null = null
  let foundArea = Infinity

  function traverse(renderable: Renderable) {
    // Skip if this is the element to exclude
    if (excludeId && renderable.id === excludeId) return

    // Check if point is inside this renderable
    if (isPointInside(renderable, x, y)) {
      const area = renderable.width * renderable.height
      // Prefer smaller elements (more specific)
      if (area < foundArea) {
        found = renderable
        foundArea = area
      }
    }

    // Check children (recurse into all children)
    for (const child of renderable.getChildren()) {
      traverse(child)
    }
  }

  // Start traversal from root's children (skip root itself)
  for (const child of root.getChildren()) {
    traverse(child)
  }

  return found
}

// Normalize margin/padding values to numbers
function normalizeSpacing(value: string | number | null | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.endsWith("%")) return 0 // Can't easily calc %
  if (value === "auto") return 0
  return 0
}

// Build a path from root to this element for context
function getElementPath(renderable: Renderable): string {
  const parts: string[] = []
  let current: Renderable | null = renderable

  while (current) {
    // Skip auto-generated IDs, use type instead
    const isAutoGen = /^box-\d+$|^text-\d+$/.test(current.id)
    const name = isAutoGen ? current.constructor.name.replace("Renderable", "") : current.id
    parts.unshift(name)
    current = current.parent
  }

  return parts.join(" > ")
}

// Get element info for display
function getElementInfo(renderable: Renderable) {
  const pos = getAbsolutePosition(renderable)
  const path = getElementPath(renderable)

  // Try to find a meaningful name
  const isAutoGen = /^box-\d+$|^text-\d+$/.test(renderable.id)
  const displayName = isAutoGen ? path.split(" > ").pop() || renderable.id : renderable.id

  // Get source location if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const source = (
    renderable as unknown as { __source?: { fileName?: string; lineNumber?: number; componentName?: string } }
  ).__source

  return {
    id: renderable.id,
    displayName,
    path,
    type: renderable.constructor.name,
    x: pos.x,
    y: pos.y,
    width: renderable.width,
    height: renderable.height,
    source,
    margin: {
      top: normalizeSpacing(renderable.marginTop),
      right: normalizeSpacing(renderable.marginRight),
      bottom: normalizeSpacing(renderable.marginBottom),
      left: normalizeSpacing(renderable.marginLeft),
    },
    padding: {
      top: normalizeSpacing(renderable.paddingTop),
      right: normalizeSpacing(renderable.paddingRight),
      bottom: normalizeSpacing(renderable.paddingBottom),
      left: normalizeSpacing(renderable.paddingLeft),
    },
  }
}

export function InspectorOverlay() {
  const inspector = useInspector()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const renderer = useRenderer()
  const toast = useToast()

  const [hoveredElement, setHoveredElement] = createSignal<Renderable | null>(null)

  const isEnabled = () => inspector.enabled()

  // Colors for different visual elements - more transparent
  const colors = createMemo(() => ({
    content: theme.primary,
    padding: theme.warning,
    margin: theme.info,
    text: theme.text,
    panelBg: RGBA.fromInts(30, 30, 30, 220), // 80% opacity dark background
    overlayBg: RGBA.fromInts(0, 0, 0, 51), // 20% opacity = 80% transparent
    border: theme.border,
    marginBg: RGBA.fromInts(255, 140, 0, 25), // Orange - more transparent
    paddingBg: RGBA.fromInts(255, 215, 0, 25), // Yellow - more transparent
    contentBg: RGBA.fromInts(0, 255, 127, 15), // Green - more transparent
    marginBorder: RGBA.fromInts(255, 140, 0, 120),
    paddingBorder: RGBA.fromInts(255, 215, 0, 120),
    contentBorder: RGBA.fromInts(0, 255, 127, 120),
  }))

  createEffect(() => {
    if (!isEnabled()) {
      inspector.setHoveredInfo(null)
      setHoveredElement(null)
    }
  })

  const mouse = () => inspector.mousePos()
  const dims = () => dimensions()

  // Find element under cursor (manually traverse to skip the overlay)
  const findElementAtPosition = (x: number, y: number): Renderable | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return findElementAtPositionTree(renderer.root as any, x, y, "inspector-overlay")
  }

  // Get element info for display
  const elementInfo = createMemo(() => {
    const el = hoveredElement()
    if (!el) return null
    return getElementInfo(el)
  })

  return (
    <Show when={isEnabled()}>
      <box
        id="inspector-overlay"
        position="absolute"
        top={0}
        left={0}
        width={dims().width}
        height={dims().height}
        zIndex={9999}
        backgroundColor={colors().overlayBg}
        onMouseMove={(e) => {
          inspector.setMousePos({ x: e.x, y: e.y })
          const el = findElementAtPosition(e.x, e.y)
          setHoveredElement(el)
        }}
        onMouseUp={async () => {
          const el = hoveredElement()
          if (el) {
            const info = getElementInfo(el)
            // Build source info string
            const sourceInfo = info.source
              ? `${info.source.componentName || info.displayName} ${info.width}x${info.height} ${info.source.fileName}:${info.source.lineNumber}`
              : `${info.displayName} ${info.width}x${info.height}`
            await Clipboard.copy(sourceInfo)
              .then(() => toast.show({ message: `Copied: ${info.displayName}`, variant: "info" }))
              .catch(() => toast.show({ message: "Failed to copy", variant: "error" }))
          }
          inspector.setEnabled(false)
        }}
      >
        {/* Element highlight - exact element bounds */}
        <Show when={elementInfo()}>
          {(info) => (
            <box
              position="absolute"
              top={info().y}
              left={info().x}
              width={info().width}
              height={info().height}
              border={["left", "right", "top", "bottom"]}
              borderColor={colors().contentBorder}
              backgroundColor={colors().contentBg}
            />
          )}
        </Show>

        {/* Position tooltip near cursor */}
        <Show when={mouse().y > 4 && elementInfo()}>
          {(info) => {
            const source = info().source
            const displayText = source
              ? `${source.componentName || info().displayName} ${info().width}x${info().height}`
              : `${info().displayName} ${info().width}x${info().height}`
            const sourceText = source ? `${source.fileName}:${source.lineNumber}` : ""

            return (
              <box
                position="absolute"
                top={mouse().y - 2}
                left={Math.min(mouse().x + 2, dims().width - 20)}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={theme.backgroundElement}
                border={["left", "right", "top", "bottom"]}
                borderColor={theme.border}
              >
                <text fg={theme.primary}>{displayText}</text>
                <Show when={sourceText}>
                  <text fg={theme.textMuted}>{sourceText}</text>
                </Show>
              </box>
            )
          }}
        </Show>
      </box>
    </Show>
  )
}
