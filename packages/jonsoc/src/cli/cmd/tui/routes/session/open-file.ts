import type { useKV } from "@tui/context/kv"
import type { useSDK } from "@tui/context/sdk"

type KVStore = ReturnType<typeof useKV>
type SDKStore = ReturnType<typeof useSDK>

export async function openFileInNavigator(kv: KVStore, sdk: SDKStore, filePath?: string, line?: number) {
  if (!filePath) return

  const normalizedPath = filePath.replace(/\\/g, "/")
  const file = await sdk.client.file.read({ path: normalizedPath }).catch(() => undefined)
  if (!file?.data) return
  if (file.data.encoding === "base64") return

  const content = file.data.content ?? ""
  const lines = content.split("\n")
  let charOffset = 0
  if (line && line > 0 && line <= lines.length) {
    const lineIndex = line - 1
    const linesBefore = lines.slice(0, lineIndex)
    charOffset = linesBefore.join("\n").length
  }

  kv.set("navigator_open", true)
  kv.set("navigator_active_path", normalizedPath)
  kv.set("navigator_open_file", { path: normalizedPath, line: charOffset })
}
