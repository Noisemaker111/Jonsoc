import { createEffect, createMemo, createResource, createSignal, For, Match, on, Show, Switch, untrack } from "solid-js"
import { createStore } from "solid-js/store"
import path from "path"
import type { ScrollBoxRenderable, TextareaRenderable } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { selectedForeground, useTheme } from "@tui/context/theme"
import { useSDK } from "@tui/context/sdk"
import { useToast } from "@tui/ui/toast"
import { useDialog } from "@tui/ui/dialog"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { usePromptRef } from "@tui/context/prompt"
import { useSync } from "@tui/context/sync"
import { SplitBorder } from "@tui/component/border"
import { useKV } from "@tui/context/kv"
import { useKeybind } from "@tui/context/keybind"
import { Filesystem } from "@/util/filesystem"
import { Locale } from "@/util/locale"
import { Global } from "@/global"
import { LANGUAGE_EXTENSIONS } from "@/lsp/language"
import type { File as FileStatus, FileContent, FileNode, VcsHistoryLine } from "@opencode-ai/sdk/v2"

type ExplorerEntry = {
  node: FileNode
  depth: number
}

type NavigatorProps = {
  width: number
  onClose: () => void
  open: boolean
  side: "left" | "right"
  wrapMode?: "word" | "none"
  promptRef?: { focused: boolean; focus: () => void } | undefined
  onOpenFile?: (path: string, line?: number) => void
}

type NavigatorTab = "explorer" | "git"

const STATUS_LABELS: Record<FileStatus["status"], string> = {
  added: "A",
  deleted: "D",
  modified: "M",
}

const NavigatorBorderChars = {
  ...SplitBorder.customBorderChars,
  vertical: "│",
}

export function Navigator(props: NavigatorProps) {
  const theme = useTheme()
  const sdk = useSDK()
  const toast = useToast()
  const dialog = useDialog()
  const promptRef = usePromptRef()
  const sync = useSync()
  const kv = useKV()
  const keybind = useKeybind()
  const term = useTerminalDimensions()
  const [loaded, setLoaded] = createSignal(false)
  const [tab, setTab] = kv.signal<NavigatorTab>("navigator_tab", "explorer")
  const [selectedExplorer, setSelectedExplorer] = kv.signal("navigator_explorer_index", 0)
  const [selectedGit, setSelectedGit] = kv.signal("navigator_git_index", 0)
  const [activePath, setActivePath] = kv.signal<string | null>("navigator_active_path", null)
  const [listRatio, setListRatio] = kv.signal<number>("navigator_list_ratio", 0.35)
  const [tree, setTree] = createStore<Record<string, FileNode[]>>({})
  const [loading, setLoading] = createStore<Record<string, boolean>>({})
  const [showScrollbar] = kv.signal("scrollbar_visible", false)
  const readExpanded = () => {
    const stored = kv.get("navigator_expanded")
    if (!stored) return {}
    if (typeof stored !== "object") return {}
    if (Array.isArray(stored)) return {}
    const next: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(stored)) {
      if (typeof value !== "boolean") continue
      next[key] = value
    }
    return next
  }
  const [expanded, setExpanded] = createStore<Record<string, boolean>>(readExpanded())
  const [explorerScroll, setExplorerScroll] = createSignal<ScrollBoxRenderable | undefined>(undefined)
  const [gitScroll, setGitScroll] = createSignal<ScrollBoxRenderable | undefined>(undefined)

  const [status, { refetch: refreshStatus }] = createResource(
    () => (loaded() ? "open" : undefined),
    async () => {
      const result = await sdk.client.file.status().catch(() => undefined)
      if (!result?.data) return []
      return result.data
    },
  )

  const historyLimit = 60
  const [history, { refetch: refreshHistory }] = createResource(
    () => (loaded() ? "open" : undefined),
    async () => {
      const result = await sdk.client.vcs.history({ limit: historyLimit }).catch(() => undefined)
      if (!result?.data) return []
      return result.data
    },
  )

  const [fileContent, setFileContent] = createSignal<FileContent | undefined>(undefined)
  const [fileLoading, setFileLoading] = createSignal(false)
  const [fileError, setFileError] = createSignal(false)
  const [cache, setCache] = createStore<Record<string, FileContent>>({})
  const [targetLine, setTargetLine] = createSignal<number | undefined>(undefined)
  const [openFileInfo, setOpenFileInfo] = kv.signal<{ path: string; line: number } | undefined>(
    "navigator_open_file",
    undefined,
  )

  // Editing state - manual save only
  const [isDirty, setIsDirty] = createSignal(false)
  const [saveStatus, setSaveStatus] = createSignal<"idle" | "saving" | "saved" | "error">("idle")
  let editorRef: TextareaRenderable | undefined
  const [currentFilePath, setCurrentFilePath] = createSignal<string | null>(null)

  const saveFile = async () => {
    const path = activePath()
    if (!path || !editorRef || !isDirty()) return

    const content = editorRef.plainText
    setSaveStatus("saving")
    try {
      const response = await fetch(`${sdk.url}/file/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      })
      if (response.ok) {
        setIsDirty(false)
        setSaveStatus("saved")
        // Update cache with new content
        setCache(path, { type: "text", content })
        setFileContent({ type: "text", content })
        setTimeout(() => setSaveStatus("idle"), 2000)
      } else {
        setSaveStatus("error")
        toast.show({ variant: "error", message: "Failed to save file" })
      }
    } catch {
      setSaveStatus("error")
      toast.show({ variant: "error", message: "Failed to save file" })
    }
  }

  const handleEditorChange = () => {
    setIsDirty(true)
    setSaveStatus("idle")
  }

  const listWidth = createMemo(() => {
    if (!props.open) return 0
    const available = Math.max(0, props.width)
    const min = Math.min(20, available)
    const max = Math.max(min, available - 20)
    const width = Math.floor(available * listRatio())
    return Math.min(max, Math.max(min, width))
  })
  const viewerWidth = createMemo(() => (props.open ? Math.max(0, props.width - listWidth()) : 0))

  const displayRoot = createMemo(() => {
    const directory = sync.data.path.directory || process.cwd()
    const replaced = directory.replace(Global.Path.home, "~")
    return Locale.truncateMiddle(replaced, 36)
  })
  const branch = createMemo(() => sync.data.vcs?.branch)

  const statusEntries = createMemo(() => status() ?? [])
  const statusMap = createMemo(() => {
    const map = new Map<string, FileStatus>()
    for (const entry of statusEntries()) {
      map.set(entry.path, entry)
    }
    return map
  })

  const explorerEntries = createMemo(() => {
    const result: ExplorerEntry[] = []

    const add = (dir: string, depth: number) => {
      const nodes = tree[dir] ?? []
      for (const node of nodes) {
        result.push({ node, depth })
        if (node.type !== "directory") continue
        if (!expanded[node.path]) continue
        add(node.path, depth + 1)
      }
    }

    add("", 0)
    return result
  })

  const gitEntries = createMemo(() => {
    const entries = [...statusEntries()]
    const order = {
      added: 0,
      modified: 1,
      deleted: 2,
    }
    return entries.toSorted((a, b) => {
      const orderDiff = order[a.status] - order[b.status]
      if (orderDiff !== 0) return orderDiff
      return a.path.localeCompare(b.path)
    })
  })

  const activeStatus = createMemo(() => {
    const file = activePath()
    if (!file) return undefined
    return statusMap().get(file)
  })

  const viewTitle = createMemo(() => {
    const file = activePath()
    if (!file) return "File Viewer"
    const statusEntry = activeStatus()
    if (!statusEntry) return file
    return `${STATUS_LABELS[statusEntry.status]} ${file}`
  })

  const hasExplorerEntries = createMemo(() => explorerEntries().length > 0)
  const hasGitEntries = createMemo(() => gitEntries().length > 0)
  const historyEntries = createMemo(() => history() ?? [])
  const historyHeight = createMemo(() => Math.max(8, Math.floor(term().height * 0.35)))

  const viewportOptions = createMemo(() => ({
    paddingRight: showScrollbar() ? 1 : 0,
  }))
  const verticalScrollbarOptions = createMemo(() => ({
    paddingLeft: 1,
    visible: showScrollbar(),
    trackOptions: {
      backgroundColor: theme.theme.backgroundElement,
      foregroundColor: theme.theme.border,
    },
  }))

  createEffect(() => {
    const next: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(expanded)) {
      next[key] = value
    }
    kv.set("navigator_expanded", next)
  })

  createEffect(() => {
    const scroll = explorerScroll()
    const entry = selectedExplorerEntry()
    if (!scroll || !entry) return
    ensureVisible(scroll, entry.node.path)
  })

  createEffect(() => {
    const scroll = gitScroll()
    const entry = selectedGitEntry()
    if (!scroll || !entry) return
    ensureVisible(scroll, entry.path)
  })

  const selectedExplorerEntry = createMemo(() => {
    const list = explorerEntries()
    if (list.length === 0) return undefined
    const index = selectedExplorer()
    if (index < 0) return undefined
    if (index >= list.length) return undefined
    return list[index]
  })

  const selectedGitEntry = createMemo(() => {
    const list = gitEntries()
    if (list.length === 0) return undefined
    const index = selectedGit()
    if (index < 0) return undefined
    if (index >= list.length) return undefined
    return list[index]
  })

  const fileData = createMemo(() => fileContent())
  const resizeLeft = createMemo(() => keybind.print("navigator_resize_narrow"))
  const resizeRight = createMemo(() => keybind.print("navigator_resize_wide"))
  const resizeLabel = createMemo(() => {
    if (!resizeLeft() && !resizeRight()) return ""
    return `${resizeLeft() || ""}${resizeLeft() && resizeRight() ? "/" : ""}${resizeRight() || ""} resize`
  })

  const ensureVisible = (scroll: ScrollBoxRenderable | undefined, id: string) => {
    if (!scroll) return
    const child = scroll.getChildren().find((entry) => entry.id === id)
    if (!child) return
    const y = child.y - scroll.y
    if (y >= scroll.height) scroll.scrollBy(y - scroll.height + 1)
    if (y < 0) scroll.scrollBy(y)
  }

  const selectExplorerIndex = (index: number) => {
    const list = explorerEntries()
    if (list.length === 0) return
    const next = Math.min(Math.max(index, 0), list.length - 1)
    setSelectedExplorer(() => next)
    const entry = list[next]
    if (!entry) return
    ensureVisible(explorerScroll(), entry.node.path)
  }

  const selectGitIndex = (index: number) => {
    const list = gitEntries()
    if (list.length === 0) return
    const next = Math.min(Math.max(index, 0), list.length - 1)
    setSelectedGit(() => next)
    const entry = list[next]
    if (!entry) return
    ensureVisible(gitScroll(), entry.path)
  }

  const loadDirectory = async (dir: string) => {
    if (loading[dir]) return
    setLoading(dir, true)
    const result = await sdk.client.file.list({ path: dir }).catch(() => undefined)
    if (!result?.data) {
      setLoading(dir, false)
      toast.show({ variant: "error", message: `Failed to load ${dir || "project"} files` })
      return
    }
    setTree(dir, result.data)
    setLoading(dir, false)
  }

  const toggleDirectory = async (node: FileNode) => {
    if (node.type !== "directory") return
    const isExpanded = expanded[node.path] ?? false
    if (isExpanded) {
      setExpanded(node.path, false)
      return
    }
    setExpanded(node.path, true)
    if (tree[node.path]) return
    await loadDirectory(node.path)
  }

  createEffect(() => {
    if (!loaded()) return
    for (const [key, value] of Object.entries(expanded)) {
      if (!value) continue
      if (!key) continue
      if (tree[key]) continue
      void loadDirectory(key)
    }
  })

  const openFilePath = (nextPath: string) => {
    const current = activePath()
    // Set loading state FIRST to prevent "No content" flash
    if (current !== nextPath) {
      setFileLoading(true)
      setFileError(false)
      setIsDirty(false)
      setSaveStatus("idle")
    }
    setActivePath(() => nextPath)
    setTargetLine(undefined)
    if (!loaded()) return
    const force = current === nextPath
    void loadFile(nextPath, force)
  }

  const openFile = (node: FileNode) => {
    if (node.type !== "file") return
    openFilePath(node.path)
  }

  const openFileAtLine = async (path: string, line?: number) => {
    const current = activePath()
    if (current !== path) {
      // Set loading state FIRST to prevent "No content" flash
      setFileLoading(true)
      setFileError(false)
      setIsDirty(false)
      setSaveStatus("idle")
      setActivePath(() => path)
    }
    if (loaded()) {
      const force = current === path
      void loadFile(path, force)
    }
    if (line && line > 0) {
      setTargetLine(line)
    }
    props.onOpenFile?.(path, line)
  }

  const handleExplorerSelect = async () => {
    const entry = selectedExplorerEntry()
    if (!entry) return
    if (entry.node.type === "directory") {
      await toggleDirectory(entry.node)
      return
    }
    openFile(entry.node)
  }

  const handleGitSelect = () => {
    const entry = selectedGitEntry()
    if (!entry) return
    openFilePath(entry.path)
  }

  const [currentLoadFile, setCurrentLoadFile] = createSignal<string | undefined>(undefined)
  const [loadNonce, setLoadNonce] = createSignal(0)

  const loadFile = async (file: string, force = false) => {
    if (fileLoading() && currentLoadFile() === file) return

    const nonce = loadNonce() + 1
    setLoadNonce(nonce)
    setCurrentLoadFile(() => file)

    // Clear previous content and state immediately before loading
    setFileContent(undefined)
    setFileLoading(true)
    setFileError(false)
    setIsDirty(false)
    setSaveStatus("idle")

    // Clear editor content immediately
    if (editorRef) {
      editorRef.setText("")
    }

    if (!force) {
      const cached = cache[file]
      if (cached) {
        if (loadNonce() !== nonce) return
        setFileContent(cached)
        setFileLoading(false)
        setFileError(false)
        setCurrentLoadFile(() => undefined)
        return
      }
    }

    const result = await sdk.client.file.read({ path: file }).catch(() => undefined)
    if (loadNonce() !== nonce) return
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
    setCurrentLoadFile(() => undefined)
  }

  const adjustListWidth = (delta: number) => {
    setListRatio((prev) => {
      const base = typeof prev === "function" ? prev(0.35) : prev
      const next = Math.min(0.6, Math.max(0.2, base + delta))
      return next
    })
  }

  const runPrompt = (input: string, mode?: "normal" | "shell") => {
    const ref = promptRef.current
    if (!ref) return
    ref.set({
      input,
      mode,
      parts: [],
    })
    ref.focus()
    ref.submit()
  }

  const runCommand = (command: string) => {
    runPrompt(`/${command}`)
  }

  const runShell = (command: string) => {
    runPrompt(command, "shell")
  }

  const refreshGit = () => {
    refreshStatus()
    refreshHistory()
  }

  const openMergeDialog = () => {
    dialog.replace(() => (
      <DialogPrompt
        title="Merge branch"
        placeholder="Branch name (e.g. main)"
        onConfirm={(value) => {
          dialog.clear()
          const name = value.trim()
          if (!name) return
          runShell(`git merge ${name}`)
        }}
        onCancel={() => dialog.clear()}
      />
    ))
  }

  useKeyboard((evt) => {
    if (!props.open) return
    if (dialog.stack.length > 0) return
    if (keybind.match("navigator_resize_narrow", evt)) {
      evt.preventDefault()
      adjustListWidth(-0.05)
      return
    }

    if (keybind.match("navigator_resize_wide", evt)) {
      evt.preventDefault()
      adjustListWidth(0.05)
      return
    }
    if (promptRef.current?.focused) return
    if (evt.name === "escape") {
      evt.preventDefault()
      return
    }
    if (evt.name === "tab") {
      evt.preventDefault()
      setTab((value) => (value === "explorer" ? "git" : "explorer"))
      return
    }

    if (tab() === "explorer") {
      if (evt.name === "up") {
        selectExplorerIndex(selectedExplorer() - 1)
        return
      }
      if (evt.name === "down") {
        selectExplorerIndex(selectedExplorer() + 1)
        return
      }
      if (evt.name === "home") {
        selectExplorerIndex(0)
        return
      }
      if (evt.name === "end") {
        selectExplorerIndex(explorerEntries().length - 1)
        return
      }
      if (evt.name === "left") {
        const entry = selectedExplorerEntry()
        if (!entry) return
        if (entry.node.type !== "directory") return
        if (!expanded[entry.node.path]) return
        setExpanded(entry.node.path, false)
        return
      }
      if (evt.name === "right") {
        handleExplorerSelect()
        return
      }
      if (evt.name === "return") {
        handleExplorerSelect()
        return
      }
    }

    if (tab() === "git") {
      if (evt.name === "up") {
        selectGitIndex(selectedGit() - 1)
        return
      }
      if (evt.name === "down") {
        selectGitIndex(selectedGit() + 1)
        return
      }
      if (evt.name === "home") {
        selectGitIndex(0)
        return
      }
      if (evt.name === "end") {
        selectGitIndex(gitEntries().length - 1)
        return
      }
      if (evt.name === "return") {
        handleGitSelect()
      }
    }
  })

  createEffect(() => {
    const list = explorerEntries()
    if (list.length === 0) return
    if (selectedExplorer() < list.length) return
    setSelectedExplorer(() => list.length - 1)
  })

  // Sync selectedExplorer with activePath so the selected file is highlighted in explorer
  createEffect(() => {
    const path = activePath()
    if (!path) return
    const list = explorerEntries()
    const index = list.findIndex((entry) => entry.node.path === path)
    if (index === -1) return
    if (selectedExplorer() === index) return
    setSelectedExplorer(() => index)
  })

  createEffect(() => {
    if (loaded()) return
    setLoaded(true)
    loadDirectory("")
  })

  createEffect(() => {
    const file = activePath()
    const fileInfo = openFileInfo()
    const isLoaded = loaded()

    if (!file) {
      setFileContent(undefined)
      setFileLoading(false)
      setFileError(false)
      // Clear editor when no file is selected
      if (editorRef) {
        editorRef.setText("")
      }
      return
    }

    if (!isLoaded) return

    // Skip if already loading this file
    if (fileLoading() && currentLoadFile() === file) return

    if (fileInfo?.path === file) {
      setTargetLine(() => fileInfo.line)
      setOpenFileInfo(() => undefined)
    }

    untrack(() => {
      void loadFile(file)
    })
  })

  createEffect(() => {
    const data = fileData()
    if (!data) return
    if (data.encoding === "base64") return
    // Clear targetLine after file data loads
    if (targetLine()) {
      setTargetLine(undefined)
    }
  })

  // Initialize edit content when file data loads - only if file changed
  createEffect(
    on(fileData, (data) => {
      const path = activePath()
      if (!data || data.encoding === "base64" || !path) return
      setCurrentFilePath(() => path)
      setIsDirty(false)
      setSaveStatus("idle")
      if (editorRef && editorRef.plainText !== data.content) {
        editorRef.setText(data.content ?? "")
      }
    }),
  )

  // Compute viewer state as a discriminated union for exclusive rendering
  const viewerState = createMemo(() => {
    const path = activePath()
    if (!path) return { type: "empty" as const }
    if (fileLoading()) return { type: "loading" as const }
    if (fileError()) return { type: "error" as const }
    const data = fileData()
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

  const fileViewer = () => (
    <scrollbox
      flexGrow={1}
      paddingTop={1}
      viewportOptions={viewportOptions()}
      verticalScrollbarOptions={verticalScrollbarOptions()}
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
                  // Set initial content when ref is assigned
                  const state = viewerState()
                  if (state.type === "text" && state.data.content !== undefined && r.plainText !== state.data.content) {
                    r.setText(state.data.content ?? "")
                  }
                }}
                textColor={theme.theme.text}
                focusedTextColor={theme.theme.text}
                cursorColor={theme.theme.text}
                focusedBackgroundColor={theme.theme.background}
                minHeight={10}
                flexGrow={1}
                wrapMode={props.wrapMode ?? "word"}
                syntaxStyle={theme.syntax()}
                onContentChange={handleEditorChange}
                onKeyDown={(e: { name: string; ctrl?: boolean; meta?: boolean; preventDefault: () => void }) => {
                  // Ctrl+S / Cmd+S to save
                  if ((e.ctrl || e.meta) && e.name === "s") {
                    e.preventDefault()
                    saveFile()
                  }
                  // Escape to blur
                  if (e.name === "escape") {
                    editorRef?.blur()
                  }
                }}
              />
            </line_number>
            <Show when={fileData()?.diff}>
              <box paddingTop={1}>
                <text fg={theme.theme.textMuted}>Git diff</text>
                <diff
                  diff={fileData()?.diff ?? ""}
                  view="unified"
                  filetype={fileType(activePath())}
                  syntaxStyle={theme.syntax()}
                  showLineNumbers={true}
                  width="100%"
                  wrapMode="word"
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
            </Show>
          </box>
        </Match>
      </Switch>
    </scrollbox>
  )

  const historyPanel = () => (
    <box height={historyHeight()} flexShrink={0} border={["top"]} borderColor={theme.theme.border}>
      <box
        paddingLeft={1}
        paddingRight={1}
        paddingTop={1}
        paddingBottom={1}
        flexDirection="row"
        justifyContent="space-between"
        backgroundColor={theme.theme.background}
      >
        <text fg={theme.theme.text}>
          <b>History</b>
          <Show when={branch()}>
            <span style={{ fg: theme.theme.textMuted }}> ({branch()})</span>
          </Show>
        </text>
        <text fg={theme.theme.textMuted}>{historyEntries().length} commits</text>
      </box>
      <scrollbox
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
        paddingBottom={1}
        viewportOptions={viewportOptions()}
        verticalScrollbarOptions={verticalScrollbarOptions()}
      >
        <Show when={historyEntries().length > 0} fallback={<text fg={theme.theme.textMuted}>No commits yet</text>}>
          <box flexDirection="column" gap={0}>
            <For each={historyEntries()}>{(entry) => <HistoryRow entry={entry} />}</For>
          </box>
        </Show>
      </scrollbox>
    </box>
  )

  const edgeBorder = createMemo<("left" | "right")[]>(() => (props.side === "left" ? ["left"] : ["right"]))

  const handleNavigatorClick = () => {
    if (props.promptRef?.focused) return
    props.promptRef?.focus()
  }

  return (
    <box
      width={props.open ? props.width : 0}
      height="100%"
      flexDirection="column"
      backgroundColor={theme.theme.background}
      border={props.open ? edgeBorder() : undefined}
      customBorderChars={props.open ? NavigatorBorderChars : undefined}
      borderColor={theme.theme.border}
      visible={props.open}
      onMouseUp={handleNavigatorClick}
    >
      <box
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        flexDirection="row"
        justifyContent="space-between"
        border={["bottom"]}
        borderColor={theme.theme.border}
        customBorderChars={NavigatorBorderChars}
      >
        <box flexDirection="column">
          <text fg={theme.theme.text}>
            <b>Navigator</b>
          </text>
          <text fg={theme.theme.textMuted}>{displayRoot()}</text>
        </box>
        <box onMouseUp={props.onClose} paddingLeft={1} paddingRight={1} backgroundColor={theme.theme.backgroundElement}>
          <text fg={theme.theme.text}>Close</text>
        </box>
      </box>
      <box flexGrow={1} flexDirection="row">
        <box
          width={listWidth()}
          border={["right"]}
          customBorderChars={NavigatorBorderChars}
          borderColor={theme.theme.border}
          flexDirection="column"
          backgroundColor={theme.theme.background}
        >
          <box paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} flexDirection="row" gap={1}>
            <Tab label="Explorer" active={tab() === "explorer"} onSelect={() => setTab(() => "explorer")} />
            <Tab label="Git" active={tab() === "git"} onSelect={() => setTab(() => "git")} />
          </box>
          <Show when={tab() === "git"}>
            <box paddingLeft={1} paddingRight={1} paddingBottom={1} gap={1}>
              <box flexDirection="row" gap={1}>
                <ActionButton label="Commit" onSelect={() => runCommand("commit")} />
                <ActionButton label="Push" onSelect={() => runShell("git push")} />
                <ActionButton label="Pull" onSelect={() => runShell("git pull --rebase")} />
              </box>
              <box flexDirection="row" gap={1}>
                <ActionButton label="Merge" onSelect={openMergeDialog} />
                <ActionButton label="Refresh" onSelect={refreshGit} />
              </box>
            </box>
          </Show>
          <Switch>
            <Match when={tab() === "git"}>
              <Show
                when={hasGitEntries()}
                fallback={
                  <box paddingLeft={2} paddingRight={2} paddingTop={1}>
                    <text fg={theme.theme.textMuted}>No git changes</text>
                  </box>
                }
              >
                <scrollbox
                  flexGrow={1}
                  paddingLeft={1}
                  paddingRight={1}
                  ref={(el) => setGitScroll(el)}
                  viewportOptions={viewportOptions()}
                  verticalScrollbarOptions={verticalScrollbarOptions()}
                >
                  <For each={gitEntries()}>
                    {(entry, index) => (
                      <GitRow
                        entry={entry}
                        width={listWidth()}
                        active={index() === selectedGit()}
                        onSelect={() => {
                          setSelectedGit(() => index())
                          openFilePath(entry.path)
                        }}
                      />
                    )}
                  </For>
                </scrollbox>
              </Show>
              {historyPanel()}
            </Match>
            <Match when={true}>
              <Show
                when={hasExplorerEntries()}
                fallback={
                  <box paddingLeft={2} paddingRight={2} paddingTop={1}>
                    <text fg={theme.theme.textMuted}>{loading[""] ? "Loading files..." : "No files found"}</text>
                  </box>
                }
              >
                <scrollbox
                  flexGrow={1}
                  paddingLeft={1}
                  paddingRight={1}
                  ref={(el) => setExplorerScroll(el)}
                  viewportOptions={viewportOptions()}
                  verticalScrollbarOptions={verticalScrollbarOptions()}
                >
                  <For each={explorerEntries()}>
                    {(entry, index) => (
                      <ExplorerRow
                        entry={entry}
                        width={listWidth()}
                        active={index() === selectedExplorer()}
                        status={statusMap().get(entry.node.path)}
                        expanded={expanded[entry.node.path] ?? false}
                        onSelect={() => {
                          setSelectedExplorer(() => index())
                          if (entry.node.type === "directory") {
                            toggleDirectory(entry.node)
                            return
                          }
                          openFile(entry.node)
                        }}
                      />
                    )}
                  </For>
                </scrollbox>
              </Show>
            </Match>
          </Switch>
        </box>
        <box
          width={viewerWidth()}
          flexDirection="column"
          paddingLeft={2}
          paddingRight={2}
          paddingTop={1}
          paddingBottom={1}
        >
          <box justifyContent="center" paddingTop={1} paddingBottom={1}>
            <text fg={theme.theme.text}>
              <b>{viewTitle()}</b>
            </text>
          </box>
          {fileViewer()}
        </box>
      </box>
      <box
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <text fg={theme.theme.textMuted}>
          {(() => {
            const status = saveStatus()
            if (status === "saving") return "Saving..."
            if (status === "saved") return "Saved"
            if (status === "error") return "Save failed"
            if (isDirty()) return "Unsaved changes"
            return "Click to edit"
          })()}
        </text>
        <text fg={theme.theme.textMuted}>{resizeLabel() ? `${resizeLabel()} - ` : ""}Esc: chat</text>
      </box>
    </box>
  )
}

function ExplorerRow(props: {
  entry: ExplorerEntry
  active: boolean
  expanded: boolean
  width: number
  status?: FileStatus
  onSelect: () => void
}) {
  const theme = useTheme()
  const indicator = createMemo(() => {
    if (props.entry.node.type !== "directory") return " "
    return props.expanded ? "v" : ">"
  })

  const statusLabel = createMemo(() => {
    if (!props.status) return ""
    return STATUS_LABELS[props.status.status]
  })

  const statusColor = createMemo(() => {
    const status = props.status
    if (!status) return theme.theme.textMuted
    if (status.status === "added") return theme.theme.diffAdded
    if (status.status === "deleted") return theme.theme.diffRemoved
    return theme.theme.warning
  })

  const fg = createMemo(() => {
    if (props.active) return selectedForeground(theme.theme, theme.theme.primary)
    if (props.entry.node.ignored) return theme.theme.textMuted
    return theme.theme.text
  })

  const nameWidth = createMemo(() => Math.max(10, props.width - (props.entry.depth * 2 + 6)))

  return (
    <box
      id={props.entry.node.path}
      flexDirection="row"
      paddingLeft={props.entry.depth * 2 + 1}
      paddingRight={1}
      backgroundColor={props.active ? theme.theme.primary : theme.theme.background}
      onMouseUp={props.onSelect}
      justifyContent="space-between"
    >
      <text fg={fg()} wrapMode="none">
        {indicator()} {Locale.truncate(props.entry.node.name, nameWidth())}
      </text>
      <Show when={statusLabel()}>
        <text fg={props.active ? selectedForeground(theme.theme, theme.theme.primary) : statusColor()}>
          {statusLabel()}
        </text>
      </Show>
    </box>
  )
}

function GitRow(props: { entry: FileStatus; active: boolean; width: number; onSelect: () => void }) {
  const theme = useTheme()
  const fg = createMemo(() => {
    if (props.active) return selectedForeground(theme.theme, theme.theme.primary)
    return theme.theme.text
  })
  const statusColor = createMemo(() => {
    if (props.entry.status === "added") return theme.theme.diffAdded
    if (props.entry.status === "deleted") return theme.theme.diffRemoved
    return theme.theme.warning
  })

  const pathWidth = createMemo(() => Math.max(10, props.width - 14))

  return (
    <box
      id={props.entry.path}
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={props.active ? theme.theme.primary : theme.theme.background}
      justifyContent="space-between"
      onMouseUp={props.onSelect}
    >
      <text fg={fg()} wrapMode="none">
        <span style={{ fg: props.active ? fg() : statusColor() }}>{STATUS_LABELS[props.entry.status]}</span>{" "}
        {Locale.truncateMiddle(props.entry.path, pathWidth())}
      </text>
      <text fg={props.active ? fg() : theme.theme.textMuted}>
        <span style={{ fg: theme.theme.diffAdded }}>+{props.entry.added}</span>
        <span style={{ fg: theme.theme.diffRemoved }}> -{props.entry.removed}</span>
      </text>
    </box>
  )
}

function ActionButton(props: { label: string; onSelect: () => void }) {
  const theme = useTheme()
  return (
    <box
      flexGrow={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={theme.theme.backgroundElement}
      onMouseUp={props.onSelect}
      justifyContent="center"
    >
      <text fg={theme.theme.text} wrapMode="none">
        [{props.label}]
      </text>
    </box>
  )
}

function HistoryRow(props: { entry: VcsHistoryLine }) {
  const theme = useTheme()
  const refs = () => props.entry.refs?.join(", ")

  return (
    <box flexDirection="row" gap={1}>
      <text wrapMode="none" fg={theme.theme.accent}>
        {props.entry.graph}
      </text>
      <Show when={props.entry.hash}>
        {(value) => (
          <text wrapMode="none" fg={theme.theme.textMuted}>
            {value().slice(0, 7)}
          </text>
        )}
      </Show>
      <box flexDirection="row" flexGrow={1} gap={1}>
        <Show when={refs()}>
          {(value) => (
            <text wrapMode="none" fg={theme.theme.warning}>
              ({value()})
            </text>
          )}
        </Show>
        <text wrapMode="none" fg={theme.theme.text} flexGrow={1}>
          {props.entry.subject}
        </text>
      </box>
    </box>
  )
}

function Tab(props: { label: string; active: boolean; onSelect: () => void }) {
  const theme = useTheme()
  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={props.active ? theme.theme.primary : theme.theme.backgroundElement}
      onMouseUp={props.onSelect}
      flexDirection="row"
      gap={1}
    >
      <Show when={props.active}>
        <text fg={selectedForeground(theme.theme, theme.theme.primary)}>•</text>
      </Show>
      <text fg={props.active ? selectedForeground(theme.theme, theme.theme.primary) : theme.theme.textMuted}>
        {props.label}
      </text>
    </box>
  )
}

function BinaryPreview(props: { content?: FileContent }) {
  const theme = useTheme()
  const description = createMemo(() => {
    const data = props.content
    if (!data) return "Binary file"
    if (!data.mimeType) return "Binary file"
    return `Binary file (${data.mimeType})`
  })

  return <text fg={theme.theme.textMuted}>{description()}</text>
}

function fileType(input?: string) {
  if (!input) return "none"
  const ext = path.extname(input)
  const language = LANGUAGE_EXTENSIONS[ext]
  if (!language) return "none"
  if (["typescriptreact", "javascriptreact", "javascript"].includes(language)) return "typescript"
  return language
}
