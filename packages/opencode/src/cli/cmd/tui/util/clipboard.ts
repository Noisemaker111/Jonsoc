import { $ } from "bun"
import { platform, release } from "os"
import clipboardy from "clipboardy"
import { lazy } from "../../../../util/lazy.js"
import { tmpdir } from "os"
import path from "path"

/**
 * Writes text to clipboard via OSC 52 escape sequence.
 * This allows clipboard operations to work over SSH by having
 * the terminal emulator handle the clipboard locally.
 */
function writeOsc52(text: string): void {
  if (!process.stdout.isTTY) return
  const base64 = Buffer.from(text).toString("base64")
  const osc52 = `\x1b]52;c;${base64}\x07`
  // tmux and screen require DCS passthrough wrapping
  const passthrough = process.env["TMUX"] || process.env["STY"]
  const sequence = passthrough ? `\x1bPtmux;\x1b${osc52}\x1b\\` : osc52
  process.stdout.write(sequence)
}

export namespace Clipboard {
  export interface Content {
    data: string
    mime: string
  }

  export function parseImageDataUrl(text: string): Content | undefined {
    const normalized = text.trim()
    const match = normalized.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i)
    if (!match) return
    const data = match[2]?.replace(/\s+/g, "")
    if (!data) return
    return { data, mime: match[1].toLowerCase() }
  }

  export async function read(): Promise<Content | undefined> {
    const os = platform()

    if (os === "darwin") {
      const tmpfile = path.join(tmpdir(), "opencode-clipboard.png")
      try {
        await $`osascript -e 'set imageData to the clipboard as "PNGf"' -e 'set fileRef to open for access POSIX file "${tmpfile}" with write permission' -e 'set eof fileRef to 0' -e 'write imageData to fileRef' -e 'close access fileRef'`
          .nothrow()
          .quiet()
        const file = Bun.file(tmpfile)
        const buffer = await file.arrayBuffer()
        if (buffer.byteLength === 0) return
        return { data: Buffer.from(buffer).toString("base64"), mime: "image/png" }
      } catch {
      } finally {
        await $`rm -f "${tmpfile}"`.nothrow().quiet()
      }
    }

    if (os === "win32" || release().includes("WSL")) {
      // Terminal paste does not provide image bytes, so we must read the OS clipboard.
      // On Windows, clipboard access can fail depending on apartment state and API used.
      // Try WPF first (PresentationCore), then WinForms, then Get-Clipboard.
      const script =
        "$ErrorActionPreference='SilentlyContinue';" +
        "$OutputEncoding=[System.Text.Encoding]::UTF8;" +
        "[Console]::OutputEncoding=$OutputEncoding;" +
        "$result=$null;" +
        "$paths=Get-Clipboard -Format FileDropList;" +
        "if($paths -and $paths.Count -gt 0){$path=$paths[0];" +
        "if(Test-Path $path){$result='FILE:'+ $path}}" +
        "$tmp=$null;" +
        "if(-not $result){$tmp=Join-Path $env:TEMP ('opencode-clipboard-' + [guid]::NewGuid().ToString() + '.png')}" +
        // WPF path
        "if(-not $result){Add-Type -AssemblyName PresentationCore;" +
        "$src=[System.Windows.Clipboard]::GetImage();" +
        "if($src){$enc=New-Object System.Windows.Media.Imaging.PngBitmapEncoder;" +
        "$enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($src));" +
        "$file=New-Object System.IO.FileStream($tmp,[System.IO.FileMode]::Create);" +
        "$enc.Save($file); $file.Close(); $result='TMPFILE:'+ $tmp}}" +
        // WinForms path
        "if(-not $result){Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing;" +
        "$img=[System.Windows.Forms.Clipboard]::GetImage();" +
        "if(-not $img){$img=Get-Clipboard -Format Image}" +
        "if($img){$img.Save($tmp,[System.Drawing.Imaging.ImageFormat]::Png); $result='TMPFILE:'+ $tmp}}" +
        "if($result){$result}"

      const base64 = await $`powershell.exe -NoProfile -NonInteractive -STA -command ${script}`.nothrow().text()
      const trimmed = base64.trim().replace(/\s+/g, "").replace(/\0/g, "")
      if (!trimmed) return

      const readFile = async (filepath: string) => {
        const file = Bun.file(filepath)
        if (!file.type.startsWith("image/")) return
        const buffer = await file.arrayBuffer()
        if (buffer.byteLength === 0) return
        return { data: Buffer.from(buffer).toString("base64"), mime: file.type }
      }

      if (trimmed.startsWith("FILE:")) {
        return readFile(trimmed.slice("FILE:".length))
      }

      if (trimmed.startsWith("TMPFILE:")) {
        const filepath = trimmed.slice("TMPFILE:".length)
        const result = await readFile(filepath)
        await $`rm -f "${filepath}"`.nothrow().quiet()
        return result
      }
    }

    if (os === "linux") {
      const wayland = await $`wl-paste -t image/png`.nothrow().arrayBuffer()
      if (wayland && wayland.byteLength > 0) {
        return { data: Buffer.from(wayland).toString("base64"), mime: "image/png" }
      }
      const x11 = await $`xclip -selection clipboard -t image/png -o`.nothrow().arrayBuffer()
      if (x11 && x11.byteLength > 0) {
        return { data: Buffer.from(x11).toString("base64"), mime: "image/png" }
      }
    }

    const text = await clipboardy.read().catch(() => {})
    if (text) {
      const image = parseImageDataUrl(text)
      if (image) return image
      return { data: text, mime: "text/plain" }
    }
  }

  export async function readText(): Promise<string | undefined> {
    const os = platform()

    if (os === "win32" || release().includes("WSL")) {
      const script =
        "$ErrorActionPreference='SilentlyContinue';" +
        "$OutputEncoding=[System.Text.Encoding]::UTF8;" +
        "[Console]::OutputEncoding=$OutputEncoding;" +
        "$txt=Get-Clipboard -Format Text -Raw;" +
        "if($txt){[Console]::Write($txt)}"
      const text = await $`powershell.exe -NoProfile -NonInteractive -STA -command ${script}`.nothrow().text()
      const trimmed = text.trim().replace(/\0/g, "")
      if (trimmed) return trimmed
    }

    if (os === "darwin" && Bun.which("pbpaste")) {
      const text = await $`pbpaste`.nothrow().text()
      const trimmed = text.trim().replace(/\0/g, "")
      if (trimmed) return trimmed
    }

    if (os === "linux") {
      if (process.env["WAYLAND_DISPLAY"] && Bun.which("wl-paste")) {
        const text = await $`wl-paste -n`.nothrow().text()
        const trimmed = text.trim().replace(/\0/g, "")
        if (trimmed) return trimmed
      }
      if (Bun.which("xclip")) {
        const text = await $`xclip -selection clipboard -o`.nothrow().text()
        const trimmed = text.trim().replace(/\0/g, "")
        if (trimmed) return trimmed
      }
      if (Bun.which("xsel")) {
        const text = await $`xsel --clipboard --output`.nothrow().text()
        const trimmed = text.trim().replace(/\0/g, "")
        if (trimmed) return trimmed
      }
    }

    const text = await clipboardy.read().catch(() => {})
    if (text) return text
  }

  const getCopyMethod = lazy(() => {
    const os = platform()

    if (os === "darwin" && Bun.which("osascript")) {
      console.log("clipboard: using osascript")
      return async (text: string) => {
        const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        await $`osascript -e 'set the clipboard to "${escaped}"'`.nothrow().quiet()
      }
    }

    if (os === "linux") {
      if (process.env["WAYLAND_DISPLAY"] && Bun.which("wl-copy")) {
        console.log("clipboard: using wl-copy")
        return async (text: string) => {
          const proc = Bun.spawn(["wl-copy"], { stdin: "pipe", stdout: "ignore", stderr: "ignore" })
          proc.stdin.write(text)
          proc.stdin.end()
          await proc.exited.catch(() => {})
        }
      }
      if (Bun.which("xclip")) {
        console.log("clipboard: using xclip")
        return async (text: string) => {
          const proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
            stdin: "pipe",
            stdout: "ignore",
            stderr: "ignore",
          })
          proc.stdin.write(text)
          proc.stdin.end()
          await proc.exited.catch(() => {})
        }
      }
      if (Bun.which("xsel")) {
        console.log("clipboard: using xsel")
        return async (text: string) => {
          const proc = Bun.spawn(["xsel", "--clipboard", "--input"], {
            stdin: "pipe",
            stdout: "ignore",
            stderr: "ignore",
          })
          proc.stdin.write(text)
          proc.stdin.end()
          await proc.exited.catch(() => {})
        }
      }
    }

    if (os === "win32") {
      console.log("clipboard: using powershell")
      return async (text: string) => {
        // Pipe via stdin to avoid PowerShell string interpolation ($env:FOO, $(), etc.)
        const proc = Bun.spawn(
          [
            "powershell.exe",
            "-NonInteractive",
            "-NoProfile",
            "-Command",
            "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())",
          ],
          {
            stdin: "pipe",
            stdout: "ignore",
            stderr: "ignore",
          },
        )

        proc.stdin.write(text)
        proc.stdin.end()
        await proc.exited.catch(() => {})
      }
    }

    console.log("clipboard: no native support")
    return async (text: string) => {
      await clipboardy.write(text).catch(() => {})
    }
  })

  export async function copy(text: string): Promise<void> {
    writeOsc52(text)
    await getCopyMethod()(text)
  }
}
