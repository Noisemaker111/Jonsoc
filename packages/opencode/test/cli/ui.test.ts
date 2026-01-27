import { describe, expect, test } from "bun:test"
import { UI } from "@/cli/ui"

describe("UI.markdown", () => {
  test("converts file references to OSC 8 hyperlinks", () => {
    const text = "See packages/opencode/src/cli/ui.ts:81 for details"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
    expect(result).toContain("file://")
    expect(result).toContain("packages/opencode/src/cli/ui.ts:81")
  })

  test("handles file references without line numbers", () => {
    const text = "Check file packages/opencode/src/cli/ui.ts"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
    expect(result).toContain("file://")
    expect(result).not.toMatch(/\.ts:\d+/)
  })

  test("preserves text that doesn't match file reference pattern", () => {
    const text = "This is just regular text without file references"
    const result = UI.markdown(text)

    expect(result).toBe(text)
  })

  test("handles quoted file references", () => {
    const text = "Look at 'packages/opencode/src/cli/ui.ts:81'"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
  })
})
