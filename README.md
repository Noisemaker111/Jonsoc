<p align="center">
  <a href="https://jonsoc.com">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="JonsOC logo">
    </picture>
  </a>
</p>
<p align="center">An open source fork of <a href="https://opencode.ai"><strong>OpenCode</strong></a> — the AI coding agent.</p>
<p align="center"><em>Built with 💐 for the original OpenCode team and community</em></p>
<p align="center">
  <a href="https://jonsoc.com/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/jonsoc"><img alt="npm" src="https://img.shields.io/npm/v/jonsoc?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/jonsoc/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/jonsoc/publish.yml?style=flat-square&branch=dev" /></a>
</p>

[![JonsOC Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://jonsoc.com)

---

## 💐 About This Fork

**JonsOC** is a community fork of **[OpenCode](https://github.com/opencode-ai/opencode)**, the incredible open-source AI coding agent created by the OpenCode team. This fork is maintained independently with additional features and enhancements while staying true to the original vision.

### Why We Forked

- To add platform-specific enhancements (Windows Terminal clipboard support, etc.)
- To provide an alternative distribution channel
- To experiment with additional features while the upstream project evolves
- To ensure continued open-source availability

### 🙏 Acknowledgments

This project would not exist without the amazing work of the **OpenCode team** and contributors. We are deeply grateful for their groundbreaking work in open-source AI coding assistants.

- **Original Project**: [OpenCode](https://github.com/opencode-ai/opencode)
- **Original Website**: [opencode.ai](https://opencode.ai)
- **License**: MIT (same as original)

Please consider supporting the original OpenCode project!

---

## 🔱 Fork-Specific Features

> [!IMPORTANT]
> **Enhanced features in this fork:**
>
> - **Clipboard image paste (Windows Terminal)** — Fixes image paste failing by pulling image data into the prompt.
> - **Double-press `esc` to clear** — Prevents accidental prompt wipes while keeping a quick clear path.

### Local `jonsoc` helper (maintainer)

- `jonsoc` runs the JonsOC build from this repo, using your current directory as the project
- From the repo root it runs `bun run dev`, elsewhere it uses the installed build
- It auto-rebuilds when sources are newer than the last built binary
- Use `jonsoc -build` or `jonsoc --build` to force a rebuild
- Use `jonsoc -safe` to run the latest npm release (`jonsoc@latest`) instead of the local build
  - Set `JONSOC_SAFE_ISOLATE=1` (or pass `-safe-isolated`) to keep safe mode config/state separate
- Use `jonsoc -check` to print `running` and exit without launching the UI
- Use `jonsoc -restart` to relaunch and reattach to the most recent session
- Windows note: rebuild can fail if `jonsoc.exe` is still running (file lock), so close any JonsOC instance before forcing a rebuild

---

### Installation

```bash
# YOLO
curl -fsSL https://jonsoc.com/install | bash

# Package managers
npm i -g jonsoc@latest        # or bun/pnpm/yarn
scoop install jonsoc             # Windows
choco install jonsoc             # Windows
brew install anomalyco/tap/jonsoc # macOS and Linux (recommended, always up to date)
brew install jonsoc              # macOS and Linux (official brew formula, updated less)
paru -S jonsoc-bin               # Arch Linux
mise use -g jonsoc               # Any OS
nix run nixpkgs#jonsoc           # or github:anomalyco/jonsoc for latest dev branch
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

JonsOC is also available as a desktop application. Download directly from the [releases page](https://github.com/anomalyco/jonsoc/releases) or [jonsoc.com/download](https://jonsoc.com/download).

| Platform              | Download                            |
| --------------------- | ----------------------------------- |
| macOS (Apple Silicon) | `jonsoc-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `jonsoc-desktop-darwin-x64.dmg`     |
| Windows               | `jonsoc-desktop-windows-x64.exe`    |
| Linux                 | `.deb`, `.rpm`, or AppImage         |

```bash
# macOS (Homebrew)
brew install --cask jonsoc-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/jonsoc-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$OPENCODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if exists or can be created)
4. `$HOME/.jonsoc/bin` - Default fallback

```bash
# Examples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://jonsoc.com/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://jonsoc.com/install | bash
```

### Agents

JonsOC includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also, included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://jonsoc.com/docs/agents).

### Documentation

For more info on how to configure JonsOC [**head over to our docs**](https://jonsoc.com/docs).

### Contributing

If you're interested in contributing to JonsOC, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on JonsOC

If you are working on a project that's related to JonsOC and is using "jonsoc" as a part of its name; for example, "jonsoc-dashboard" or "jonsoc-mobile", please add a note to your README to clarify that it is not built by the JonsOC team and is not affiliated with us in any way.

### FAQ

#### How is this different from Claude Code?

It's very similar to Claude Code in terms of capability. Here are the key differences:

- 100% open source
- Not coupled to any provider. Although we recommend the models we provide through [JonsOC Zen](https://jonsoc.com/zen); JonsOC can be used with Claude, OpenAI, Google or even local models. As models evolve the gaps between them will close and pricing will drop so being provider-agnostic is important.
- Out of the box LSP support
- A focus on TUI. JonsOC is built by neovim users and the creators of [terminal.shop](https://terminal.shop); we are going to push the limits of what's possible in the terminal.
- A client/server architecture. This for example can allow JonsOC to run on your computer, while you can drive it remotely from a mobile app. Meaning that the TUI frontend is just one of the possible clients.

---

**Join our community** [Discord](https://discord.gg/jonsoc) | [X.com](https://x.com/jonsoc)
