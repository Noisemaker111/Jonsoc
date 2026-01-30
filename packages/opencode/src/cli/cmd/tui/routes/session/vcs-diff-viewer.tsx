import { type Accessor } from "solid-js"
import { useTheme } from "@tui/context/theme"

export type VcsDiffViewerProps = {
    diff: Accessor<string | undefined>
    fileType: string
    wrapMode: "word" | "none"
}

export function VcsDiffViewer(props: VcsDiffViewerProps) {
    const theme = useTheme()

    return (
        <box paddingTop={1}>
            <text fg={theme.theme.textMuted}>Git diff</text>
            <diff
                diff={props.diff() ?? ""}
                view="unified"
                filetype={props.fileType}
                syntaxStyle={theme.syntax()}
                showLineNumbers={true}
                width="100%"
                wrapMode={props.wrapMode}
                fg={theme.theme.text}
                addedBg={theme.theme.diffAddedBg}
                removedBg={theme.theme.diffRemovedBg}
                contextBg={theme.theme.diffContextBg}
                addedSignColor={theme.theme.diffHighlightAdded}
                removedSignColor={theme.theme.diffHighlightRemoved}
                lineNumberFg={theme.theme.diffLineNumber}
                lineNumberBg={theme.theme.diffContextBg}
                addedLineNumberBg={theme.theme.diffAddedLineNumberBg}
                removedLineNumberBg={theme.theme.diffRemovedLineNumberBg}
            />
        </box>
    )
}
