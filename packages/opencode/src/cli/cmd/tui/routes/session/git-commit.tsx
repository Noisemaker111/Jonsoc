import { type Accessor } from "solid-js"
import type { InputRenderable } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { ActionButton } from "./navigator-ui"

export type GitCommitProps = {
  commitMessage: Accessor<string>
  setCommitMessage: (msg: string) => void
  onCommit: () => void
}

export function GitCommit(props: GitCommitProps) {
  const theme = useTheme()
  let input: InputRenderable

  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      flexDirection="row"
      gap={1}
      flexShrink={0}
      backgroundColor={theme.theme.background}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <box
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={theme.theme.backgroundElement}
        onMouseUp={() => input?.focus()}
      >
        <input
          ref={(el) => (input = el)}
          placeholder="Message..."
          value={props.commitMessage()}
          onInput={props.setCommitMessage}
          onMouseUp={() => input?.focus()}
          onKeyDown={(e) => {
            if (e.name === "return" && (e.ctrl || e.meta)) {
              props.onCommit()
            }
          }}
          focusedBackgroundColor={theme.theme.backgroundElement}
          cursorColor={theme.theme.primary}
        />
      </box>
      <ActionButton
        label="Commit"
        onSelect={props.onCommit}
        disabled={!props.commitMessage().trim()}
        primary
        flexGrow={0}
      />
    </box>
  )
}
