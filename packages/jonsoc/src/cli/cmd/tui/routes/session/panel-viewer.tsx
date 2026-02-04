import { batch, createEffect, createMemo, createSignal, Match, on, onCleanup, Show, Switch } from "solid-js"
import { createStore } from "solid-js/store"
import path from "path"
import type { ScrollBoxRenderable, TextareaRenderable, ScrollAcceleration } from "@opentui/core"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "@tui/context/theme"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useKV } from "@tui/context/kv"
import { useErrorLog } from "@tui/context/error-log"
import { useToast } from "@tui/ui/toast"
import { useDialog } from "@tui/ui/dialog"
import { Filesystem } from "@/util/filesystem"
import { LANGUAGE_EXTENSIONS } from "@/lsp/language"
import type { FileContent } from "@jonsoc/sdk/v2"
import { VcsDiffViewer } from "./vcs-diff-viewer"
import { NavigatorBorderChars, fileType, BinaryPreview } from "./navigator-ui"

class CustomSpeedScroll implements ScrollAcceleration {
  constructor(private speed: number) {}

  tick(_now?: number): number {
    return this.speed
  }

  reset(): void {}
}

interface FileViewerPanelProps {
  width: number
  filePath: string | null
  wrapMode?: "word" | "none"
  viewMode?: "file" | "diff"
  onFocus?: () => void
}

export function FileViewerPanel(props: FileViewerPanelProps) {
  const theme = useTheme()
  const sdk = useSDK()
  const toast = useToast()
  const sync = useSync()
  const kv = useKV()
  const errorLog = useErrorLog()

  const [fileContent, setFileContent] = createSignal<FileContent | undefined>(undefined)
  const [fileLoading, setFileLoading] = createSignal(false)
  const [fileError, setFileError] = createSignal(false)
  const [cache, setCache] = createStore<Record<string, FileContent>>({})
  const [showScrollbar] = kv.signal("scrollbar_enabled", true)

  // Editing state - manual save only
  const [isDirty, setIsDirty] = createSignal(false)
  const [saveStatus, setSaveStatus] = createSignal<"idle" | "saving" | "saved" | "error">("idle")
  let editorRef: TextareaRenderable | undefined
  const [scrollRef, setScrollRef] = createSignal<ScrollBoxRenderable | undefined>(undefined)
  const [currentFilePath, setCurrentFilePath] = createSignal<string | null>(null)
  const [autosaveTimer, setAutosaveTimer] = createSignal<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [currentLoadFile, setCurrentLoadFile] = createSignal<string | undefined>(undefined)
  const [loadNonce, setLoadNonce] = createSignal(0)
  const viewMode = createMemo(() => props.viewMode ?? "file")

  const viewportOptions = createMemo(() => ({
    paddingRight: showScrollbar() ? 2 : 1,
  }))

  const verticalScrollbarOptions = createMemo(() => ({
    paddingLeft: 1,
    visible: showScrollbar(),
    trackOptions: {
      backgroundColor: theme.theme.backgroundElement,
      foregroundColor: theme.theme.border,
    },
  }))

  const saveFile = async () => {
    const filePath = props.filePath
    if (!filePath || !editorRef || !isDirty() || saveStatus() === "saving") return

    const pendingAutosave = autosaveTimer()
    if (pendingAutosave) {
      clearTimeout(pendingAutosave)
      setAutosaveTimer(undefined)
    }

    const content = editorRef.plainText
    setSaveStatus("saving")
    try {
      const directory = sync.data.path.directory
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(directory, filePath)

      await Bun.write(fullPath, content)

      setIsDirty(false)
      setSaveStatus("saved")
      // Update cache with new content
      setCache(filePath, { type: "text", content })
      setFileContent({ type: "text", content })
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (err: any) {
      const fullMessage = `Failed to save ${filePath}\n\n${err.message || "FileSystem error"}`
      setSaveStatus("error")
      errorLog.add(fullMessage, "FileViewerPanel")
    }
  }

  const handleEditorChange = () => {
    setIsDirty(true)
    setSaveStatus("idle")

    const pendingAutosave = autosaveTimer()
    if (pendingAutosave) {
      clearTimeout(pendingAutosave)
    }
    const nextTimer = setTimeout(() => {
      setAutosaveTimer(undefined)
      void saveFile()
    }, 1000)
    setAutosaveTimer(nextTimer)
  }

  onCleanup(() => {
    const pendingAutosave = autosaveTimer()
    if (pendingAutosave) {
      clearTimeout(pendingAutosave)
    }
    if (isDirty()) {
      void saveFile()
    }
  })

  const loadFile = async (file: string, force = false) => {
    // Check loading state and path in a single untracked lookup to avoid loops
    const alreadyLoading = fileLoading() && currentLoadFile() === file
    if (alreadyLoading) return

    const nonce = loadNonce() + 1

    batch(() => {
      setLoadNonce(nonce)
      setCurrentLoadFile(() => file)

      // Clear previous content and state immediately before loading
      setFileContent(undefined)
      setFileLoading(true)
      setFileError(false)
      setIsDirty(false)
      setSaveStatus("idle")
    })

    if (!force) {
      const cached = cache[file]
      if (cached) {
        if (loadNonce() !== nonce) return
        batch(() => {
          setFileContent(cached)
          setFileLoading(false)
          setFileError(false)
          setCurrentFilePath(() => file)
          setCurrentLoadFile(() => undefined)
        })
        return
      }
    }

    const result = await sdk.client.file.read({ path: file }).catch(() => undefined)
    if (loadNonce() !== nonce) return

    batch(() => {
      if (!result?.data) {
        setFileContent(undefined)
        setFileLoading(false)
        setFileError(true)
        setCurrentLoadFile(() => undefined)
        return
      }
      setCache(file, result.data)
      setFileContent(result.data)
      setFileLoading(false)
      setCurrentFilePath(() => file)
      setCurrentLoadFile(() => undefined)
    })
  }

  // Load file when filePath changes - use untrack to avoid circular deps
  createEffect(() => {
    const file = props.filePath
    if (!file) {
      batch(() => {
        setFileContent(undefined)
        setFileLoading(false)
        setFileError(false)
        setCurrentFilePath(null)
      })
      if (editorRef) {
        editorRef.setText("")
      }
      return
    }
    // Only load if file actually changed
    if (file !== currentFilePath()) {
      void loadFile(file)
    }
  })

  // Initialize edit content when file data loads
  createEffect(
    on(fileContent, (data, prevData) => {
      if (!data || data.encoding === "base64") return
      // Only update if content actually changed
      if (prevData && data.content === prevData.content) return

      batch(() => {
        setIsDirty(false)
        setSaveStatus("idle")
      })

      if (editorRef && data.content && editorRef.plainText !== data.content) {
        editorRef.setText(data.content)
      }
    }),
  )

  // Compute viewer state as a discriminated union for exclusive rendering
  const viewerState = createMemo(() => {
    const path = props.filePath
    if (!path) return { type: "empty" as const }
    if (fileLoading()) return { type: "loading" as const }
    if (fileError()) return { type: "error" as const }
    const data = fileContent()
    if (!data) return { type: "no-content" as const }
    if (data.encoding === "base64") return { type: "binary" as const, data }
    return { type: "text" as const, data }
  })

  // Focus editor when clicking on the editor area
  const focusEditor = () => {
    if (viewerState().type === "text") {
      setTimeout(() => editorRef?.focus(), 0)
    }
  }

  // Keyboard shortcuts
  const dialog = useDialog()
  useKeyboard((evt) => {
    if (dialog.isOpen()) return
    if (evt.ctrl || evt.meta) {
      if (evt.name === "s") {
        evt.preventDefault()
        void saveFile()
        return
      }
    }
  })

  const statusText = createMemo(() => {
    switch (saveStatus()) {
      case "saving":
        return "Saving..."
      case "saved":
        return "Saved"
      case "error":
        return "Error"
      case "idle":
      default:
        return isDirty() ? "Modified" : ""
    }
  })

  const statusColor = createMemo(() => {
    switch (saveStatus()) {
      case "saving":
        return theme.theme.warning
      case "saved":
        return theme.theme.diffAdded
      case "error":
        return theme.theme.diffRemoved
      case "idle":
      default:
        return isDirty() ? theme.theme.warning : theme.theme.textMuted
    }
  })

  return (
    <box width={props.width} height="100%" flexDirection="row" onMouseUp={props.onFocus}>
      {/* Left side: header + content */}
      <box flexDirection="column" flexGrow={1} backgroundColor={theme.theme.background}>
        {/* Header with file path and status */}
        <box
          flexDirection="row"
          paddingLeft={2}
          paddingRight={2}
          paddingTop={1}
          paddingBottom={1}
          border={["bottom"]}
          borderColor={theme.theme.border}
          customBorderChars={NavigatorBorderChars}
          backgroundColor={theme.theme.backgroundPanel}
          flexShrink={0}
        >
          <text fg={theme.theme.text} wrapMode="none" flexGrow={1}>
            {props.filePath ?? "No file selected"}
          </text>
        </box>

        {/* File content viewer */}
        <box flexDirection="row" flexGrow={1} height="100%">
          <scrollbox
            ref={(r) => setScrollRef(r)}
            flexGrow={1}
            height="100%"
            paddingTop={1}
            viewportOptions={viewportOptions()}
            verticalScrollbarOptions={verticalScrollbarOptions()}
            scrollAcceleration={new CustomSpeedScroll(3)}
          >
            <Switch>
              <Match when={viewerState().type === "empty"}>
                <text fg={theme.theme.textMuted}>Select a file to edit</text>
              </Match>
              <Match when={viewerState().type === "loading"}>
                <text fg={theme.theme.textMuted}>Loading...</text>
              </Match>
              <Match when={viewerState().type === "error"}>
                <text fg={theme.theme.textMuted}>Unable to read file</text>
              </Match>
              <Match when={viewerState().type === "no-content"}>
                <text fg={theme.theme.textMuted}>No content</text>
              </Match>
              <Match when={viewerState().type === "binary"}>
                <BinaryPreview content={(viewerState() as { type: "binary"; data: FileContent }).data} />
              </Match>
              <Match when={viewerState().type === "text"}>
                <Show
                  when={viewMode() === "diff"}
                  fallback={
                    <box flexDirection="column" flexGrow={1} onMouseUp={focusEditor}>
                      <line_number
                        fg={theme.theme.textMuted}
                        bg={theme.theme.background}
                        paddingRight={1}
                        minWidth={3}
                        showLineNumbers={true}
                        flexGrow={1}
                      >
                        <textarea
                          ref={(r: TextareaRenderable) => {
                            editorRef = r
                            const state = viewerState()
                            if (
                              state.type === "text" &&
                              state.data.content !== undefined &&
                              r.plainText !== state.data.content
                            ) {
                              r.setText(state.data.content ?? "")
                            }
                          }}
                          textColor={theme.theme.text}
                          focusedTextColor={theme.theme.text}
                          cursorColor={theme.theme.text}
                          focusedBackgroundColor={theme.theme.background}
                          minHeight={10}
                          flexGrow={1}
                          wrapMode={props.wrapMode ?? "none"}
                          syntaxStyle={theme.syntax()}
                          onContentChange={handleEditorChange}
                          onKeyDown={(e: {
                            name: string
                            ctrl?: boolean
                            meta?: boolean
                            preventDefault: () => void
                          }) => {
                            if ((e.ctrl || e.meta) && e.name === "s") {
                              e.preventDefault()
                              void saveFile()
                            }
                            if (e.name === "escape") {
                              editorRef?.blur()
                            }
                          }}
                        />
                      </line_number>
                      <Show when={fileContent()?.diff}>
                        <VcsDiffViewer
                          diff={() => fileContent()!.diff!}
                          fileType={fileType(props.filePath ?? undefined)}
                          wrapMode={props.wrapMode ?? "none"}
                        />
                      </Show>
                    </box>
                  }
                >
                  <Show when={fileContent()?.diff} fallback={<text fg={theme.theme.textMuted}>No diff available</text>}>
                    <VcsDiffViewer
                      diff={() => fileContent()!.diff!}
                      fileType={fileType(props.filePath ?? undefined)}
                      wrapMode={props.wrapMode ?? "none"}
                    />
                  </Show>
                </Show>
              </Match>
            </Switch>
          </scrollbox>
        </box>
      </box>

      {/* Right border - spans full height from top to bottom */}
      <box width={1} height="100%" border={["right"]} borderColor={theme.theme.border} />
    </box>
  )
}
