import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { createMemo, createSignal } from "solid-js"
import { useTheme } from "../context/theme"
import { useSDK } from "../context/sdk"
import { useToast } from "../ui/toast"

interface StashEntry {
  index: number
  message: string
}

export function DialogGitStash(props: {
  stashList: string[]
  onPop: (index: number) => void
  onApply: (index: number) => void
  onDrop: (index: number) => void
  onRefresh: () => void
}) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const sdk = useSDK()
  const toast = useToast()

  const [toDelete, setToDelete] = createSignal<number>()

  const parseStashEntry = (line: string): StashEntry => {
    const match = line.match(/stash@\{(\d+)\}: (.+)/)
    if (match) {
      return { index: parseInt(match[1]), message: match[2] }
    }
    return { index: 0, message: line }
  }

  const options = createMemo(() => {
    return props.stashList.map((line, idx) => {
      const entry = parseStashEntry(line)
      const isDeleting = toDelete() === idx
      return {
        title: isDeleting ? "Press Enter again to confirm drop" : entry.message,
        bg: isDeleting ? theme.error : undefined,
        value: idx,
        description: `stash@{${entry.index}}`,
      }
    })
  })

  const handlePop = async (index: number) => {
    try {
      const rawClient = Reflect.get(sdk.client, "client")
      if (!rawClient || typeof rawClient !== "object") return
      const request = Reflect.get(rawClient, "request")
      if (typeof request !== "function") return

      await request({
        url: "/vcs/stash/pop",
        method: "POST",
        body: { index },
        headers: { "Content-Type": "application/json" },
        responseStyle: "data",
        throwOnError: true,
      })

      toast.show({ variant: "success", message: "Stash popped successfully" })
      props.onRefresh()
      dialog.clear()
    } catch (err: any) {
      toast.show({ variant: "error", message: `Failed to pop stash: ${err.message}` })
    }
  }

  const handleApply = async (index: number) => {
    try {
      const rawClient = Reflect.get(sdk.client, "client")
      if (!rawClient || typeof rawClient !== "object") return
      const request = Reflect.get(rawClient, "request")
      if (typeof request !== "function") return

      await request({
        url: "/vcs/stash/apply",
        method: "POST",
        body: { index },
        headers: { "Content-Type": "application/json" },
        responseStyle: "data",
        throwOnError: true,
      })

      toast.show({ variant: "success", message: "Stash applied successfully" })
      props.onRefresh()
      dialog.clear()
    } catch (err: any) {
      toast.show({ variant: "error", message: `Failed to apply stash: ${err.message}` })
    }
  }

  const handleDrop = async (index: number) => {
    if (toDelete() !== index) {
      setToDelete(index)
      return
    }

    try {
      const rawClient = Reflect.get(sdk.client, "client")
      if (!rawClient || typeof rawClient !== "object") return
      const request = Reflect.get(rawClient, "request")
      if (typeof request !== "function") return

      await request({
        url: "/vcs/stash/drop",
        method: "POST",
        body: { index },
        headers: { "Content-Type": "application/json" },
        responseStyle: "data",
        throwOnError: true,
      })

      toast.show({ variant: "success", message: "Stash dropped" })
      setToDelete(undefined)
      props.onRefresh()
      if (props.stashList.length <= 1) {
        dialog.clear()
      }
    } catch (err: any) {
      toast.show({ variant: "error", message: `Failed to drop stash: ${err.message}` })
    }
  }

  return (
    <DialogSelect
      title={`Stashes (${props.stashList.length})`}
      options={options()}
      onMove={() => {
        setToDelete(undefined)
      }}
      onSelect={(option) => {
        handlePop(option.value)
      }}
      keybind={[
        {
          keybind: { name: "a", ctrl: true, meta: false, shift: false, super: false, leader: false },
          title: "apply",
          onTrigger: (option) => {
            handleApply(option.value)
          },
        },
        {
          keybind: { name: "d", ctrl: true, meta: false, shift: false, super: false, leader: false },
          title: "drop",
          onTrigger: (option) => {
            handleDrop(option.value)
          },
        },
      ]}
    />
  )
}
