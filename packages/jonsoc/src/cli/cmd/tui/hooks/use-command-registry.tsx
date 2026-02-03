import { useCommandDialog, type CommandOption } from "../component/dialog-command"
import { useLayout } from "../context/layout"
import { useKV } from "../context/kv"
import { useRoute } from "../context/route"
import { useSync } from "../context/sync"
import { useTheme } from "../context/theme"
import { useToast } from "../ui/toast"
import { useLocal } from "../context/local"
import { useSDK } from "../context/sdk"
import { useInspector } from "../context/inspector"
import type { Route } from "../context/route"

// Define all command groups
export type CommandGroup =
  | "layout" // Panel toggles, /ui
  | "navigation" // Home, session switching
  | "session" // Share, rename, timeline, etc.
  | "display" // Timestamps, thinking, conceal, etc.
  | "system" // Tips, help, etc.

// Command definitions by group
const COMMAND_DEFINITIONS: Record<CommandGroup, (ctx: CommandContext) => CommandOption[]> = {
  layout: (ctx) => [
    {
      title: ctx.layout.getPanelByType("explorer")?.visible ? "Hide navigator" : "Show navigator",
      value: "session.navigator.toggle",
      keybind: "navigator_toggle",
      category: "Session",
      onSelect: (dialog) => {
        ctx.layout.togglePanel("explorer")
        dialog.clear()
      },
    },
    {
      title: ctx.layout.getPanelByType("viewer")?.visible ? "Hide file viewer" : "Show file viewer",
      value: "session.viewer.toggle",
      category: "Session",
      onSelect: (dialog) => {
        ctx.layout.togglePanel("viewer")
        dialog.clear()
      },
    },
    {
      title: ctx.navigatorTab() === "git" ? "Keep file explorer on" : "Keep git controls on",
      value: "session.navigator.git.toggle",
      category: "Session",
      onSelect: (dialog) => {
        ctx.toggleNavigatorTab()
        dialog.clear()
      },
    },
    {
      title: "Configure UI Layout",
      value: "session.ui_settings",
      category: "Session",
      slash: {
        name: "ui",
        aliases: ["layout", "configure"],
      },
      onSelect: (dialog) => {
        dialog.clear()
        ctx.navigate({
          type: "ui-settings",
          returnTo: ctx.returnTo,
        })
      },
    },
  ],

  navigation: (ctx) => [
    // Navigation commands go here
  ],

  session: (ctx) => [
    // Session-specific commands go here (share, rename, etc.)
  ],

  display: (ctx) => [
    // Display toggle commands go here
  ],

  system: (ctx) => [
    {
      title: ctx.inspector?.enabled() ? "Disable element inspector" : "Enable element inspector",
      value: "app.inspector.toggle",
      keybind: "inspector_toggle",
      category: "System",
      onSelect: (dialog) => {
        ctx.inspector?.setEnabled((prev) => !prev)
        dialog.clear()
      },
    },
    {
      title: "Usage",
      value: "app.usage",
      category: "System",
      slash: {
        name: "usage",
      },
      onSelect: (dialog) => {
        dialog.clear()
        ctx.navigate({
          type: "usage",
          returnTo: ctx.returnTo,
        })
      },
    },
  ],
}

interface CommandContext {
  layout: ReturnType<typeof useLayout>
  kv: ReturnType<typeof useKV>
  navigate: ReturnType<typeof useRoute>["navigate"]
  returnTo: Route
  navigatorTab: () => "explorer" | "git"
  toggleNavigatorTab: () => void
  inspector?: ReturnType<typeof useInspector>
  sync?: ReturnType<typeof useSync>
  theme?: ReturnType<typeof useTheme>
  toast?: ReturnType<typeof useToast>
  local?: ReturnType<typeof useLocal>
  sdk?: ReturnType<typeof useSDK>
}

// Validate that commands are only registered from allowed locations
const VALID_REGISTRATION_LOCATIONS = [
  "routes/home.tsx",
  "routes/session/index.tsx",
  "hooks/use-command-registry.tsx", // Only this hook should register commands
]

export function useCommandRegistry(options: {
  groups: CommandGroup[]
  returnTo: Route
  additionalCommands?: CommandOption[]
}) {
  const command = useCommandDialog()
  const layout = useLayout()
  const kv = useKV()
  const { navigate } = useRoute()
  const [navigatorTab, setNavigatorTab] = kv.signal<"explorer" | "git">("navigator_tab", "explorer")

  const toggleNavigatorTab = () => {
    setNavigatorTab((prev) => (prev === "git" ? "explorer" : "git"))
  }

  const inspector = useInspector()

  const ctx: CommandContext = {
    layout,
    kv,
    navigate,
    returnTo: options.returnTo,
    navigatorTab: () => navigatorTab(),
    toggleNavigatorTab,
    inspector,
  }

  // Build command list from groups
  const commands = options.groups.flatMap((group) => {
    const definitions = COMMAND_DEFINITIONS[group]
    if (!definitions) {
      console.error(`[CommandRegistry] Unknown command group: ${group}`)
      return []
    }
    return definitions(ctx)
  })

  // Add any additional commands
  if (options.additionalCommands) {
    commands.push(...options.additionalCommands)
  }

  // Register all commands at once
  command.register(() => commands)

  return {
    // Expose context helpers for additional commands
    layout,
    kv,
    navigate,
    navigatorTab: () => navigatorTab(),
    toggleNavigatorTab,
    toggleNavigator: () => layout.togglePanel("explorer"),
    toggleSidebar: () => layout.togglePanel("viewer"),
  }
}

// Utility to prevent direct command registration outside the registry
export function validateCommandRegistration(location: string): boolean {
  const isValid = VALID_REGISTRATION_LOCATIONS.some((valid) => location.includes(valid))
  if (!isValid) {
    console.warn(
      `[CommandRegistry] Commands should not be registered from ${location}. ` + `Use useCommandRegistry() instead.`,
    )
  }
  return isValid
}
