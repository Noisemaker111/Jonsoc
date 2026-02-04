import { type Accessor, createMemo, For, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import type { ScrollAcceleration } from "@opentui/core"
import { useTheme, selectedForeground } from "@tui/context/theme"
import { Locale } from "@/util/locale"
import type { VcsHistoryLine } from "@jonsoc/sdk/v2"

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
  onStashView: () => void
  stashCount: Accessor<number>
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
            <box backgroundColor={theme.theme.backgroundElement} paddingLeft={1} paddingRight={1}>
              <text fg={theme.theme.text} wrapMode="none">
                {props.branch()}
              </text>
            </box>
          </Show>
        </box>
        <box flexDirection="row" gap={1}>
          <Show when={props.stashCount() > 0}>
            <box
              backgroundColor={theme.theme.backgroundElement}
              paddingLeft={1}
              paddingRight={1}
              onMouseUp={props.onStashView}
            >
              <text fg={theme.theme.text} wrapMode="none">
                📦 {props.stashCount()}
              </text>
            </box>
          </Show>
          <text fg={theme.theme.textMuted}>{props.historyEntries().length} commits</text>
        </box>
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

  const displayRefs = createMemo(() => {
    const refs = props.entry.refs ?? []
    const head = refs.find((ref) => ref.includes("HEAD -> "))
    const tag = refs.find((ref) => ref.startsWith("tag: "))
    const local = refs.find((ref) => !ref.includes("/") && !ref.startsWith("tag: ") && !ref.includes("HEAD -> "))
    const remote = refs.find((ref) => ref.includes("/") && !ref.startsWith("tag: ") && !ref.includes("HEAD -> "))
    const primary = head ?? local ?? remote
    const result: string[] = []
    if (primary) result.push(primary.replace("HEAD -> ", ""))
    if (tag && tag !== primary) result.push(tag.replace("tag: ", "tag "))
    return result
  })

  return (
    <box flexDirection="row" gap={1}>
      <text wrapMode="none" fg={theme.theme.textMuted}>
        {graph()}
      </text>
      <box flexDirection="row" flexGrow={1} gap={1} overflow="hidden">
        <text wrapMode="none" fg={theme.theme.text} attributes={TextAttributes.BOLD} flexGrow={1} flexShrink={1}>
          {props.entry.subject}
        </text>

        <Show when={displayRefs().length > 0}>
          <box flexDirection="row" gap={1} flexShrink={0} paddingLeft={1}>
            <For each={displayRefs()}>
              {(ref, index) => {
                const isPrimary = createMemo(() => index() === 0)
                const isTag = createMemo(() => ref.startsWith("tag "))
                const bg = createMemo(() => (isPrimary() ? theme.theme.primary : theme.theme.backgroundElement))
                const fg = createMemo(() =>
                  isPrimary() ? selectedForeground(theme.theme, theme.theme.primary) : theme.theme.textMuted,
                )
                return (
                  <box backgroundColor={bg()} paddingLeft={1} paddingRight={1} flexShrink={0}>
                    <text wrapMode="none" fg={fg()} attributes={isTag() ? TextAttributes.BOLD : undefined}>
                      {ref}
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
