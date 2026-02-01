export namespace Brand {
  export const BRAND_NAME = process.env.JONSOC_BRAND ?? process.env.OPENCODE_BRAND ?? "jonsoc"

  export const BRAND_LOWER = BRAND_NAME.toLowerCase()

  export const CLI_NAME = process.env.JONSOC_CLI_NAME ?? process.env.OPENCODE_CLI_NAME ?? BRAND_LOWER

  export const DOMAIN = process.env.JONSOC_DOMAIN ?? process.env.OPENCODE_DOMAIN ?? `${BRAND_LOWER}.com`

  export const DOMAIN_WITH_PROTOCOL = `https://${DOMAIN}`

  export const API_DOMAIN = process.env.JONSOC_API_DOMAIN ?? process.env.OPENCODE_API_DOMAIN ?? `api.${DOMAIN}`

  export const API_URL = `https://${API_DOMAIN}`

  export const DOCS_DOMAIN = process.env.JONSOC_DOCS_DOMAIN ?? process.env.OPENCODE_DOCS_DOMAIN ?? `docs.${DOMAIN}`

  export const DOCS_URL = `https://${DOCS_DOMAIN}`

  // MODELS_URL defaults to opencode.ai's models.dev infrastructure
  // This is intentionally NOT customizable by default because:
  // 1. Models like minimax/m2.1 are hosted by opencode.ai
  // 2. Forks typically want their own branding but still use opencode.ai's model infrastructure
  // 3. To use your own models, you must explicitly set OPENCODE_MODELS_URL
  export const MODELS_URL = process.env.OPENCODE_MODELS_URL ?? "https://models.dev"

  export const INSTALL_URL =
    process.env.JONSOC_INSTALL_URL ?? process.env.OPENCODE_INSTALL_URL ?? `${DOMAIN_WITH_PROTOCOL}/install`

  export const CONFIG_SCHEMA_URL =
    process.env.JONSOC_CONFIG_SCHEMA ?? process.env.OPENCODE_CONFIG_SCHEMA ?? `${DOMAIN_WITH_PROTOCOL}/config.json`

  export const WELL_KNOWN_PATH = `/.well-known/${BRAND_LOWER}`

  export const LEGACY_WELL_KNOWN_PATH = "/.well-known/jonsoc"

  export const CONFIG_DIR = `.${BRAND_LOWER}`

  export const LEGACY_CONFIG_DIR = ".jonsoc"

  export const ALLOW_LEGACY_OPENCODE_CONFIGS = true

  export const CONFIG_FILES: string[] = (() => {
    const files = [`${BRAND_LOWER}.jsonc`, `${BRAND_LOWER}.json`]
    if (ALLOW_LEGACY_OPENCODE_CONFIGS) {
      files.push("jonsoc.jsonc", "jonsoc.json")
    }
    return files
  })()

  export const APP_NAME = process.env.JONSOC_APP_NAME ?? process.env.OPENCODE_APP_NAME ?? BRAND_LOWER

  export const REPO = process.env.JONSOC_REPO ?? process.env.OPENCODE_REPO ?? `Noisemaker111/Jonsoc`

  export const NPM_PACKAGE = process.env.JONSOC_NPM_PACKAGE ?? process.env.OPENCODE_NPM_PACKAGE ?? "jonsoc"

  export const LEGACY_NPM_PACKAGE = "jonsoc"

  export const LEGACY_CLI_NAME = "jonsoc"

  export const HOMEBREW_TAP =
    process.env.JONSOC_HOMEBREW_TAP ?? process.env.OPENCODE_HOMEBREW_TAP ?? "Noisemaker111/homebrew-tap"

  export const USER_AGENT = `${CLI_NAME}/cli/local/local/cli`

  export const CONFIG_TARGETS: string[] = (() => {
    const targets = [`.${BRAND_LOWER}`]
    if (ALLOW_LEGACY_OPENCODE_CONFIGS) {
      targets.unshift(".jonsoc")
    }
    return targets
  })()
}
