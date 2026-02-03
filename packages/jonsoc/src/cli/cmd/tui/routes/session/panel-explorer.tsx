import {
  batch,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js"
import { createStore } from "solid-js/store"
import type { ScrollBoxRenderable, ScrollAcceleration } from "@opentui/core"
import { TextAttributes } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "@tui/context/theme"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useKV } from "@tui/context/kv"
import { usePromptRef } from "@tui/context/prompt"
import { useToast } from "@tui/ui/toast"
import { useDialog } from "@tui/ui/dialog"
import { SplitBorder } from "@tui/component/border"
import { Locale } from "@/util/locale"
import { Global } from "@/global"
import type { File as FileStatus, FileNode } from "@jonsoc/sdk/v2"

type FileStatusWithStaged = FileStatus & { staged: boolean }
import { GitCommit } from "./git-commit"
import { GitHistory } from "./git-history"
import { NavigatorBorderChars, Tab, ExplorerRow, GitRow, ActionButton } from "./navigator-ui"

class CustomSpeedScroll implements ScrollAcceleration {
  constructor(private speed: number) {}

  tick(_now?: number): number {
    return this.speed
  }

  reset(): void {}
}

type ExplorerEntry = {
  node: FileNode
  depth: number
}

type ExplorerTab = "explorer" | "git"

interface ExplorerPanelProps {
  width: number
  onSelect: (path: string, type: "file" | "directory" | "diff") => void
}

export function ExplorerPanel(props: ExplorerPanelProps) {
  const theme = useTheme()
  const sdk = useSDK()
  const toast = useToast()
  const sync = useSync()
  const kv = useKV()
  const promptRef = usePromptRef()
  const term = useTerminalDimensions()

  const [loaded, setLoaded] = createSignal(false)
  const [tab, setTab] = kv.signal<ExplorerTab>("panel_explorer_tab", "explorer")
  const [selectedExplorer, setSelectedExplorer] = kv.signal("panel_explorer_index", 0)
  const [selectedGit, setSelectedGit] = kv.signal("panel_git_index", 0)
  const [tree, setTree] = createStore<Record<string, FileNode[]>>({})
  const [loading, setLoading] = createStore<Record<string, boolean>>({})
  const [showScrollbar] = kv.signal("scrollbar_enabled", true)

  const readExpanded = () => {
    const stored = kv.get("panel_explorer_expanded")
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
  const [commitMessage, setCommitMessage] = createSignal("")

  const [status, { refetch: refreshStatus, mutate: mutateStatus }] = createResource(
    () => (loaded() ? "open" : undefined),
    async () => {
      const result = await sdk.client.file.status().catch(() => undefined)
      if (!result?.data) return []
      return result.data.map((entry) => {
        const staged = "staged" in entry && typeof entry.staged === "boolean" ? entry.staged : false
        return { ...entry, staged }
      })
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

  const displayRoot = createMemo(() => {
    const directory = sync.data.path.directory || process.cwd()
    const replaced = directory.replace(Global.Path.home, "~")
    return Locale.truncateMiddle(replaced, 36)
  })

  const branch = createMemo(() => sync.data.vcs?.branch)

  const statusEntries = createMemo(() => status() ?? [])
  const statusMap = createMemo(() => {
    const map = new Map<string, FileStatusWithStaged>()
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

  const stagedEntries = createMemo(() => {
    const entries = statusEntries().filter((e) => e.staged)
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

  const unstagedEntries = createMemo(() => {
    const entries = statusEntries().filter((e) => !e.staged)
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

  const hasExplorerEntries = createMemo(() => explorerEntries().length > 0)
  const hasStagedEntries = createMemo(() => stagedEntries().length > 0)
  const hasUnstagedEntries = createMemo(() => unstagedEntries().length > 0)
  const hasGitEntries = createMemo(() => statusEntries().length > 0)

  const allGitEntries = createMemo(() => {
    return [...stagedEntries(), ...unstagedEntries()]
  })

  const historyEntries = createMemo(() => history() ?? [])
  const historyHeight = createMemo(() => Math.max(8, Math.floor(term().height * 0.35)))

  const hasCommitsToPush = createMemo(() => {
    const hist = historyEntries()
    return hist.length > 0
  })

  const viewportOptions = createMemo(() => ({
    paddingLeft: 1,
    paddingRight: showScrollbar() ? 2 : 1,
    paddingTop: 0,
    paddingBottom: 0,
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
    kv.set("panel_explorer_expanded", next)
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
    const list = allGitEntries()
    if (list.length === 0) return undefined
    const index = selectedGit()
    if (index < 0) return undefined
    if (index >= list.length) return undefined
    return list[index]
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
    const list = allGitEntries()
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

  const handleExplorerSelect = async () => {
    const entry = selectedExplorerEntry()
    if (!entry) return
    if (entry.node.type === "directory") {
      await toggleDirectory(entry.node)
      return
    }
    props.onSelect(entry.node.path, "file")
  }

  const handleGitSelect = () => {
    const entry = selectedGitEntry()
    if (!entry) return
    props.onSelect(entry.path, "diff")
  }

  const refreshGit = () => {
    refreshStatus()
    refreshHistory()
  }

  const cloneStatusEntries = (entries: FileStatusWithStaged[]) => entries.map((entry) => ({ ...entry }))

  const updateStatusEntries = (updater: (entries: FileStatusWithStaged[]) => FileStatusWithStaged[]) => {
    mutateStatus((entries) => {
      if (!entries) return entries
      return updater(entries)
    })
  }

  const applyOptimisticStage = (path: string, staged: boolean) => {
    const current = statusEntries()
    if (!current.length) return () => {}
    const snapshot = cloneStatusEntries(current)
    updateStatusEntries((entries) => entries.map((entry) => (entry.path === path ? { ...entry, staged } : entry)))
    return () => mutateStatus(snapshot)
  }

  const applyOptimisticStageAll = (staged: boolean) => {
    const current = statusEntries()
    if (!current.length) return () => {}
    const snapshot = cloneStatusEntries(current)
    updateStatusEntries((entries) =>
      entries.map((entry) =>
        staged ? { ...entry, staged: true } : entry.staged ? { ...entry, staged: false } : entry,
      ),
    )
    return () => mutateStatus(snapshot)
  }

  type VcsRequest = (options: {
    url: string
    method: "POST"
    body: { path: string }
    headers: Record<string, string>
    responseStyle: "data"
    throwOnError: true
  }) => Promise<unknown>

  const getVcsRequest = (): VcsRequest | undefined => {
    const rawClient = Reflect.get(sdk.client, "client")
    if (!rawClient || typeof rawClient !== "object") return undefined
    const request = Reflect.get(rawClient, "request")
    if (typeof request !== "function") return undefined
    return (options) => request(options)
  }

  const runVcsRequest = async (url: string, path: string) => {
    const request = getVcsRequest()
    if (!request) {
      throw new Error("SDK client unavailable")
    }
    const result = await request({
      url,
      method: "POST",
      body: { path },
      headers: { "Content-Type": "application/json" },
      responseStyle: "data",
      throwOnError: true,
    })
    if (result === false) {
      throw new Error("VCS operation failed")
    }
  }

  const handleStage = async (path: string) => {
    const revert = applyOptimisticStage(path, true)
    try {
      await runVcsRequest("/vcs/stage", path)
      void refreshStatus()
    } catch (err: any) {
      revert()
      toast.show({ variant: "error", message: `Failed to stage: ${err.message}` })
    }
  }

  const handleUnstage = async (path: string) => {
    const revert = applyOptimisticStage(path, false)
    try {
      await runVcsRequest("/vcs/unstage", path)
      void refreshStatus()
    } catch (err: any) {
      revert()
      toast.show({ variant: "error", message: `Failed to unstage: ${err.message}` })
    }
  }

  const handleStageAll = async () => {
    const entries = unstagedEntries()
    if (entries.length === 0) return
    const revert = applyOptimisticStageAll(true)
    try {
      for (const entry of entries) {
        await runVcsRequest("/vcs/stage", entry.path)
      }
      void refreshStatus()
      toast.show({ variant: "success", message: `Staged ${entries.length} file${entries.length === 1 ? "" : "s"}` })
    } catch (err: any) {
      revert()
      toast.show({ variant: "error", message: `Failed to stage all: ${err.message}` })
    }
  }

  const handleUnstageAll = async () => {
    const entries = stagedEntries()
    if (entries.length === 0) return
    const revert = applyOptimisticStageAll(false)
    try {
      for (const entry of entries) {
        await runVcsRequest("/vcs/unstage", entry.path)
      }
      void refreshStatus()
      toast.show({ variant: "success", message: `Unstaged ${entries.length} file${entries.length === 1 ? "" : "s"}` })
    } catch (err: any) {
      revert()
      toast.show({ variant: "error", message: `Failed to unstage all: ${err.message}` })
    }
  }

  const handleCommit = async () => {
    const msg = commitMessage().trim()
    if (!msg) return
    if (!hasStagedEntries()) {
      toast.show({ variant: "error", message: "No staged files to commit" })
      return
    }

    const directory = sync.data.path.directory
    try {
      const commitProc = Bun.spawn({
        cmd: ["git", "commit", "-m", msg],
        cwd: directory,
        stdout: "pipe",
        stderr: "pipe",
      })
      const exitCode = await commitProc.exited

      if (exitCode === 0) {
        toast.show({ variant: "success", message: "Changes committed" })
        refreshGit()
      } else {
        const stderr = await new Response(commitProc.stderr).text()
        toast.show({ variant: "error", message: `Commit failed: ${stderr}` })
      }
    } catch (err: any) {
      toast.show({ variant: "error", message: `Commit failed: ${err.message}` })
    }

    setCommitMessage("")
  }

  const handlePush = async () => {
    try {
      await fetch(`${sdk.url}/vcs/push`, { method: "POST" })
      toast.show({ variant: "success", message: "Pushed to remote" })
      refreshGit()
    } catch (err: any) {
      toast.show({ variant: "error", message: `Push failed: ${err.message}` })
    }
  }

  const openBranchSwitcher = async () => {
    const list = await fetch(`${sdk.url}/vcs/branches`)
      .then((r) => r.json())
      .catch(() => [])
    if (!list || !Array.isArray(list)) return

    const current = branch()
    // Branch switcher would need dialog context, skipping for now
    // This is a simplified version without dialog support
  }

  const dialog = useDialog()
  useKeyboard((evt) => {
    if (dialog.isOpen()) return
    if (promptRef.current?.focused) return
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
        selectGitIndex(allGitEntries().length - 1)
        return
      }
      if (evt.name === "return") {
        handleGitSelect()
        return
      }
      if (evt.name === "s") {
        const entry = selectedGitEntry()
        if (!entry) return
        if (entry.staged) {
          handleUnstage(entry.path)
        } else {
          handleStage(entry.path)
        }
        return
      }
    }
  })

  createEffect(() => {
    const list = explorerEntries()
    if (list.length === 0) return
    const current = selectedExplorer()
    if (current < list.length) return
    setSelectedExplorer(() => list.length - 1)
  })

  createEffect(() => {
    if (loaded()) return
    setLoaded(true)
    loadDirectory("")
  })

  // Auto-refresh Git status periodically
  createEffect(() => {
    if (tab() !== "git") return
    const id = setInterval(refreshGit, 10000)
    onCleanup(() => clearInterval(id))
  })

  return (
    <box width={props.width} height="100%" flexDirection="column" backgroundColor={theme.theme.background}>
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
        backgroundColor={theme.theme.backgroundPanel}
        flexShrink={0}
      >
        <box flexDirection="column">
          <text fg={theme.theme.textMuted}>{displayRoot()}</text>
        </box>
      </box>

      <box
        backgroundColor={theme.theme.background}
        flexDirection="row"
        justifyContent="center"
        paddingTop={0}
        paddingBottom={1}
        flexShrink={0}
      >
        <Tab label="Explorer" active={tab() === "explorer"} onSelect={() => setTab(() => "explorer")} />
        <Tab label="Git" active={tab() === "git"} onSelect={() => setTab(() => "git")} />
      </box>

      <Switch>
        <Match when={tab() === "git"}>
          <GitCommit
            commitMessage={commitMessage}
            setCommitMessage={setCommitMessage}
            onCommit={handleCommit}
            onPush={handlePush}
            hasCommitsToPush={hasCommitsToPush}
          />
          <Show
            when={hasGitEntries()}
            fallback={
              <box paddingLeft={2} paddingRight={2} paddingTop={1} flexGrow={1}>
                <text fg={theme.theme.textMuted}>No git changes</text>
              </box>
            }
          >
            <scrollbox
              flexGrow={1}
              height="100%"
              ref={(el) => setGitScroll(el)}
              viewportOptions={viewportOptions()}
              verticalScrollbarOptions={verticalScrollbarOptions()}
              scrollAcceleration={new CustomSpeedScroll(3)}
            >
              {/* Staged Section */}
              <Show when={hasStagedEntries()}>
                <box
                  flexDirection="row"
                  justifyContent="space-between"
                  paddingLeft={1}
                  paddingRight={1}
                  paddingTop={1}
                  paddingBottom={1}
                  backgroundColor={theme.theme.backgroundPanel}
                >
                  <text fg={theme.theme.textMuted} attributes={TextAttributes.BOLD}>
                    Staged
                  </text>
                  <box flexDirection="row" gap={1}>
                    <ActionButton
                      label="Unstage All"
                      onSelect={handleUnstageAll}
                      disabled={!hasStagedEntries()}
                      flexGrow={0}
                    />
                  </box>
                </box>
                <For each={stagedEntries()}>
                  {(entry, index) => (
                    <GitRow
                      entry={entry}
                      width={props.width}
                      active={index() === selectedGit()}
                      onSelect={() => {
                        setSelectedGit(() => index())
                        props.onSelect(entry.path, "file")
                      }}
                      onAction={() => handleUnstage(entry.path)}
                      actionLabel="-"
                    />
                  )}
                </For>
              </Show>

              {/* Unstaged Section */}
              <Show when={hasUnstagedEntries()}>
                <box
                  flexDirection="row"
                  justifyContent="space-between"
                  paddingLeft={1}
                  paddingRight={1}
                  paddingTop={1}
                  paddingBottom={1}
                  backgroundColor={theme.theme.backgroundPanel}
                >
                  <text fg={theme.theme.textMuted} attributes={TextAttributes.BOLD}>
                    Changes
                  </text>
                  <box flexDirection="row" gap={1}>
                    <ActionButton
                      label="Stage All"
                      onSelect={handleStageAll}
                      disabled={!hasUnstagedEntries()}
                      flexGrow={0}
                    />
                  </box>
                </box>
                <For each={unstagedEntries()}>
                  {(entry, index) => {
                    const offsetIndex = () => stagedEntries().length + index()
                    return (
                      <GitRow
                        entry={entry}
                        width={props.width}
                        active={offsetIndex() === selectedGit()}
                        onSelect={() => {
                          setSelectedGit(() => offsetIndex())
                          props.onSelect(entry.path, "diff")
                        }}
                        onAction={() => handleStage(entry.path)}
                        actionLabel="+"
                      />
                    )
                  }}
                </For>
              </Show>
            </scrollbox>
          </Show>
          <GitHistory
            branch={branch}
            historyEntries={historyEntries}
            historyHeight={historyHeight}
            onBranchSwitcher={openBranchSwitcher}
            viewportOptions={viewportOptions()}
            verticalScrollbarOptions={verticalScrollbarOptions()}
          />
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
              height="100%"
              ref={(el) => setExplorerScroll(el)}
              viewportOptions={viewportOptions()}
              verticalScrollbarOptions={verticalScrollbarOptions()}
              scrollAcceleration={new CustomSpeedScroll(3)}
            >
              <For each={explorerEntries()}>
                {(entry, index) => (
                  <ExplorerRow
                    entry={entry}
                    width={props.width}
                    active={index() === selectedExplorer()}
                    status={statusMap().get(entry.node.path)}
                    expanded={expanded[entry.node.path] ?? false}
                    onSelect={() => {
                      setSelectedExplorer(() => index())
                      if (entry.node.type === "directory") {
                        toggleDirectory(entry.node)
                        props.onSelect(entry.node.path, "directory")
                        return
                      }
                      props.onSelect(entry.node.path, "file")
                    }}
                  />
                )}
              </For>
            </scrollbox>
          </Show>
        </Match>
      </Switch>
    </box>
  )
}
