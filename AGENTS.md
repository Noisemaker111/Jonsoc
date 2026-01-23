# OpenCode Agent Guidelines

This repository is a fork of OpenCode maintained by **Noisemaker111**. All changes and contributions must be targeted at the `Noisemaker111/opencode` repository on the `dev` branch.

## Build and Test Commands

The project uses **Bun** as the primary runtime and package manager.

- **Install Dependencies**: `bun install`
- **Run Development Mode**: `bun dev` (Runs `bun run --conditions=browser ./src/index.ts` in `packages/opencode`)
- **Typecheck**: `bun run typecheck` (Runs `tsgo --noEmit`)
- **Lint**: `bun run lint` (Runs `bun test --coverage`)
- **Format**: `bun run format` (Runs Prettier)
- **Run All Tests**: `bun test`
- **Run Single Test**: `bun test <path-to-test-file>` (e.g., `bun test packages/opencode/test/tool.test.ts`)
- **Regenerate SDK**: `./packages/sdk/js/script/build.ts`

## Code Style & Conventions

Follow these project-specific patterns to maintain consistency.

### 1. General Principles

- **Minimal Changes**: Favor surgical, precise edits over broad refactors.
- **Type Safety**: Avoid `any`. Use strict TypeScript types and Zod schemas for validation.
- **Single Functionality**: Keep things in one function unless they are explicitly reusable or composable.
- **Early Returns**: Prefer early returns and IIFEs over nested `if/else` blocks. Avoid `else` whenever possible.

### 2. Naming Conventions

- **Variables & Functions**: Use `camelCase`.
- **Classes & Namespaces**: Use `PascalCase`.
- **Variable Names**: Prefer single-word names (e.g., `item` instead of `selectedItem`) where context allows. Avoid unnecessary verbosity.

### 3. Imports & Structure

- **Relative Imports**: Use relative paths for local modules.
- **Named Imports**: Preferred over default imports for better grep-ability and clarity.
- **Persistence**: Use the `Storage` namespace for persistent data.
- **DI**: Use `App.provide()` for dependency injection patterns.

### 4. Logic & State

- **Avoid `let`**: Prefer `const` with ternary operators for conditional assignments.
- **Immutability**: Favor immutable patterns.
- **Error Handling**: Use Result patterns instead of throwing exceptions in tool implementations.

### 5. Tool Implementation

- Implement the `Tool.Info` interface.
- Always include `sessionID` in tool context.
- Validate all inputs using **Zod**.

## VCS & PR Guidelines

- **Repository**: Only make changes to `Noisemaker111/opencode`.
- **Branching**: The default branch is `dev`. Create feature branches from `dev`.
- **Commits**: Be extremely concise. Grammar is secondary to brevity.
- **Jujutsu (jj)**: ALWAYS check for a `.jj/` directory before running VCS commands. If present, use `jj` instead of `git`.

## Efficiency Reminders

- **Parallelism**: Use parallel tool calls (e.g., multiple `read` or `grep` calls) whenever tasks are independent to maximize speed.
- **No Chitchat**: Keep interaction professional and concise. Focus on the task.
