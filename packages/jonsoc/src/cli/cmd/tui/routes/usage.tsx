import { useRoute, useRouteData } from "@tui/context/route"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions, useKeyboard } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { useKV } from "@tui/context/kv"
import { useSync } from "@tui/context/sync"
import { createMemo, Show, For } from "solid-js"
import { Locale } from "@/util/locale"
import { parseUsageCache, type UsageEntry } from "@tui/util/usage"

export function Usage() {
  const route = useRouteData("usage")
  const { navigate } = useRoute()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const kv = useKV()
  const sync = useSync()

  const entries = createMemo<UsageEntry[]>(() => {
    const cache = parseUsageCache(kv.get("usage_provider_cache", {}))
    return Object.values(cache)
      .filter((entry) => entry.rateLimit || entry.status === "rate-limited")
      .toSorted((a, b) => b.updatedAt - a.updatedAt)
  })

  const safeDimensions = createMemo(() => {
    const dims = dimensions()
    return {
      width: dims?.width ?? 80,
      height: dims?.height ?? 24,
    }
  })

  const providerName = (entry: UsageEntry) => {
    const provider = sync.data.provider.find((item) => item.id === entry.providerID)
    return provider?.name ?? entry.providerID
  }

  const modelName = (entry: UsageEntry) => {
    if (!entry.modelID) return undefined
    const provider = sync.data.provider.find((item) => item.id === entry.providerID)
    return provider?.models?.[entry.modelID]?.name ?? entry.modelID
  }

  const formatNumber = (value?: number) => {
    if (value === undefined) return "?"
    return Locale.number(Math.max(0, Math.round(value)))
  }

  const buildDetails = (entry: UsageEntry): string[] => {
    const details: string[] = []
    const rateLimit = entry.rateLimit
    if (rateLimit?.limit !== undefined || rateLimit?.remaining !== undefined) {
      const limit = formatNumber(rateLimit?.limit)
      const remaining = formatNumber(rateLimit?.remaining)
      details.push(`Remaining: ${remaining} / ${limit}`)
    }
    if (rateLimit?.retryAfterMs !== undefined) {
      details.push(`Retry after: ${Locale.duration(rateLimit.retryAfterMs)}`)
    }
    if (rateLimit?.resetAt !== undefined) {
      details.push(`Resets at: ${Locale.time(rateLimit.resetAt)}`)
    }
    if (rateLimit?.scope) {
      details.push(`Scope: ${rateLimit.scope}`)
    }
    if (entry.message) {
      details.push(Locale.truncate(entry.message, 120))
    }
    return details
  }

  const handleReturn = () => {
    if (route.returnTo) {
      navigate(route.returnTo)
    } else {
      navigate({ type: "home" })
    }
  }

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      handleReturn()
    }
  })

  return (
    <box
      width={safeDimensions().width}
      height={safeDimensions().height}
      flexDirection="column"
      backgroundColor={theme.background}
    >
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
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Usage
        </text>
        <text fg={theme.textMuted} onMouseUp={handleReturn}>
          [Back]
        </text>
      </box>
      <box flexGrow={1} flexDirection="column" paddingLeft={2} paddingRight={2} paddingTop={1} gap={1}>
        <Show
          when={entries().length > 0}
          fallback={
            <box flexDirection="column" gap={1}>
              <text fg={theme.textMuted}>No usage data yet.</text>
              <text fg={theme.textMuted}>Usage appears after a provider returns usage or rate-limit headers.</text>
            </box>
          }
        >
          <For each={entries()}>
            {(entry) => (
              <box
                paddingTop={1}
                paddingBottom={1}
                paddingLeft={2}
                paddingRight={2}
                border={["left"]}
                borderColor={theme.borderActive}
                backgroundColor={theme.backgroundPanel}
                flexDirection="column"
                gap={1}
              >
                <box flexDirection="row" justifyContent="space-between" gap={2}>
                  <text fg={theme.text}>
                    <span style={{ bold: true }}>{providerName(entry)}</span>
                    <Show when={modelName(entry)}>
                      {(name) => <span style={{ fg: theme.textMuted }}>{` · ${name()}`}</span>}
                    </Show>
                  </text>
                  <text fg={theme.textMuted}>{Locale.time(entry.updatedAt)}</text>
                </box>
                <text fg={theme.textMuted}>
                  Status: {entry.status === "rate-limited" ? "Rate-limited" : "Retrying"}
                </text>
                <For each={buildDetails(entry)}>{(detail) => <text fg={theme.text}>{detail}</text>}</For>
              </box>
            )}
          </For>
        </Show>
      </box>
    </box>
  )
}
