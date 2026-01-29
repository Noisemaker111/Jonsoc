import { describe, expect, test } from "bun:test"
import { UI } from "@/cli/ui"

describe("UI.markdown", () => {
  test("converts file references with context keyword to OSC 8 hyperlinks", () => {
    const text = "See packages/opencode/src/cli/ui.ts:81 for details"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
    expect(result).toContain("file://")
    expect(result).toContain("packages/opencode/src/cli/ui.ts:81")
  })

  test("handles file references without line numbers", () => {
    const text = "Check packages/opencode/src/cli/ui.ts"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
    expect(result).toContain("file://")
    expect(result).not.toMatch(/\.ts:\d+/)
  })

  test("preserves text without context keywords", () => {
    const text = "This is just regular text without file references"
    const result = UI.markdown(text)

    expect(result).toBe(text)
  })

  test("preserves paths without context keywords", () => {
    const text = "packages/opencode/src/cli/ui.ts"
    const result = UI.markdown(text)

    // Should not convert without context keyword
    expect(result).toBe(text)
  })

  test("handles quoted file references", () => {
    const text = "Look at 'packages/opencode/src/cli/ui.ts:81'"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
  })

  test("handles Windows paths with backslashes", () => {
    const text = "Edit packages\\opencode\\src\\cli\\ui.ts:81"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
    expect(result).toContain("file://")
  })

  test("handles Edit context keyword", () => {
    const text = "Edit src/main.ts"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
  })

  test("handles File context keyword", () => {
    const text = "File: src/main.ts"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
  })

  test("handles at context keyword", () => {
    const text = "Look at src/main.ts:10"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
  })

  test("handles in context keyword", () => {
    const text = "Look in src/main.ts"
    const result = UI.markdown(text)

    expect(result).toContain("\x1b]8;;")
  })
})
