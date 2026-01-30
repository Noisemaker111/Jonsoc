import { type Accessor, createMemo, For, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import type { ScrollAcceleration } from "@opentui/core"
import { useTheme, selectedForeground } from "@tui/context/theme"
import { Locale } from "@/util/locale"
import type { VcsHistoryLine } from "@opencode-ai/sdk/v2"

class CustomSpeedScroll implements ScrollAcceleration {
  constructor(private speed: number) {}

  tick(_now?: number): number {
    return this.speed
  }

  reset(): void {}
}

export type GitHistoryProps = {
  branch: Accessor<string | undefined>
  historyEntries: Accessor<VcsHistoryLine[]>
  historyHeight: Accessor<number>
  onBranchSwitcher: () => void
  viewportOptions: any
  verticalScrollbarOptions: any
}

export function GitHistory(props: GitHistoryProps) {
  const theme = useTheme()

  return (
    <box height={props.historyHeight()} flexShrink={0}>
      <box
        paddingLeft={1}
        paddingRight={1}
        paddingTop={1}
        paddingBottom={1}
        flexDirection="row"
        justifyContent="space-between"
        backgroundColor={theme.theme.background}
        border={["top"]}
        borderColor={theme.theme.border}
      >
        <box flexDirection="row" gap={1} onMouseUp={props.onBranchSwitcher}>
          <text fg={theme.theme.text}>
            <b>History</b>
          </text>
          <Show when={props.branch()}>
            <box backgroundColor={theme.theme.primary} paddingLeft={1} paddingRight={1}>
              <text fg={selectedForeground(theme.theme, theme.theme.primary)} wrapMode="none">
                {props.branch()}
              </text>
            </box>
          </Show>
        </box>
        <text fg={theme.theme.textMuted}>{props.historyEntries().length} commits</text>
      </box>
      <scrollbox
        flexGrow={1}
        height="100%"
        paddingBottom={1}
        viewportOptions={props.viewportOptions}
        verticalScrollbarOptions={props.verticalScrollbarOptions}
        scrollAcceleration={new CustomSpeedScroll(3)}
      >
        <Show
          when={props.historyEntries().length > 0}
          fallback={<text fg={theme.theme.textMuted}>No commits yet</text>}
        >
          <box flexDirection="column" gap={0}>
            <For each={props.historyEntries()}>{(entry) => <HistoryRow entry={entry} />}</For>
          </box>
        </Show>
      </scrollbox>
    </box>
  )
}

function HistoryRow(props: { entry: VcsHistoryLine & { author?: string } }) {
  const theme = useTheme()

  const graph = () =>
    props.entry.graph.replace(/\*/g, "●").replace(/\|/g, "│").replace(/\//g, "╯").replace(/\\/g, "╰").replace(/_/g, "─")

  const cleanedRefs = createMemo(() => {
    if (!props.entry.refs) return []
    return props.entry.refs.map((r) => r.replace("HEAD -> ", "● "))
  })

  return (
    <box flexDirection="row" gap={1}>
      <text wrapMode="none" fg={theme.theme.accent}>
        {graph()}
      </text>
      <box flexDirection="row" flexGrow={1} gap={1} overflow="hidden">
        <text wrapMode="none" fg={theme.theme.text} flexGrow={1} flexShrink={1}>
          {props.entry.subject}
        </text>

        <Show when={cleanedRefs().length > 0}>
          <box flexDirection="row" gap={1} flexShrink={0} backgroundColor={theme.theme.background} paddingLeft={1}>
            <For each={cleanedRefs()}>
              {(ref) => {
                const isHead = createMemo(() => ref.includes("● ") || ref.includes("tag: "))
                const bg = createMemo(() => (isHead() ? theme.theme.warning : theme.theme.backgroundElement))
                const fg = createMemo(() =>
                  isHead() ? selectedForeground(theme.theme, theme.theme.warning) : theme.theme.textMuted,
                )
                return (
                  <box backgroundColor={bg()} paddingLeft={1} paddingRight={1} flexShrink={0}>
                    <text wrapMode="none" fg={fg()} attributes={isHead() ? TextAttributes.BOLD : undefined}>
                      {ref.replace("tag: ", "🏷 ")}
                    </text>
                  </box>
                )
              }}
            </For>
          </box>
        </Show>
      </box>
    </box>
  )
}
