# packages/ui

## OVERVIEW

Shared SolidJS UI library: components, theme, styles, assets.

## STRUCTURE

- src/components: UI components and icons
- src/theme: theme types, defaults, loaders
- src/styles: global and Tailwind styles
- src/context: UI context providers
- src/hooks: shared hooks
- src/i18n: shared strings
- src/assets: fonts and audio
- src/pierre: diff rendering helpers

## WHERE TO LOOK

- Edit packages/ui/src/components: Solid components
- Edit packages/ui/src/theme/index.ts: theme entry
- Edit packages/ui/src/theme/default-themes.ts: built-in themes
- Edit packages/ui/src/styles/index.css: base styles
- Edit packages/ui/src/styles/tailwind/index.css: Tailwind tokens
- Edit packages/ui/src/pierre/index.ts: diff renderer exports
- Edit packages/ui/src/i18n/index.ts: i18n exports

## CONVENTIONS

- Public exports are controlled via package.json subpath exports
- Run `bun run --cwd packages/ui generate:tailwind` after Tailwind token changes

## ANTI-PATTERNS

- Editing generated sprite sheets or build output in `dist/`
