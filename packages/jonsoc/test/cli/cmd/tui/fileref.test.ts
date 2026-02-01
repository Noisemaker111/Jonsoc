import { describe, expect, test } from "bun:test"

describe("File reference regex", () => {
  test("matches file with line number", () => {
    const regex = /([`'"<]?)([\w\-./]+\/[\w\-./]+(?:\.[\w]+)?)(?::(\d+))?/g
    const text = "packages/jonsoc/src/cli/ui.ts:82"
    const matches = [...text.matchAll(regex)]
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0][2]).toBe("packages/jonsoc/src/cli/ui.ts")
    expect(matches[0][3]).toBe("82")
  })

  test("matches file without line number", () => {
    const regex = /([`'"<]?)([\w\-./]+\/[\w\-./]+(?:\.[\w]+)?)(?::(\d+))?/g
    const text = "packages/jonsoc/src/cli/ui.ts"
    const matches = [...text.matchAll(regex)]
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0][2]).toBe("packages/jonsoc/src/cli/ui.ts")
    expect(matches[0][3]).toBeUndefined()
  })

  test("matches file in text", () => {
    const regex = /([`'"<]?)([\w\-./]+\/[\w\-./]+(?:\.[\w]+)?)(?::(\d+))?/g
    const text = "Check packages/jonsoc/src/cli/ui.ts:82 for details"
    const matches = [...text.matchAll(regex)]
    expect(matches.length).toBe(1)
    expect(matches[0][2]).toBe("packages/jonsoc/src/cli/ui.ts")
    expect(matches[0][3]).toBe("82")
  })
})
