# sdks/vscode

## OVERVIEW

VS Code extension that launches JonsOC in an integrated terminal.

## STRUCTURE

- src/extension.ts: activation and command handlers
- images: icons and button assets
- esbuild.js: bundling
- package.json: contribution points and commands

## WHERE TO LOOK

- Edit sdks/vscode/src/extension.ts: command handlers
- Edit sdks/vscode/package.json: commands, keybindings, activation
- Edit sdks/vscode/esbuild.js: build config
- Edit sdks/vscode/README.md: dev workflow

## CONVENTIONS

- Open VS Code from `sdks/vscode`, not repo root
- Use `F5` to debug after `bun install` in this folder

## ANTI-PATTERNS

- Editing `dist/extension.js` directly
