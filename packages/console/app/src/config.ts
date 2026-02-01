/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://jonsoc.com",

  // GitHub
  github: {
    repoUrl: "https://github.com/Noisemaker111/Jonsoc",
    starsFormatted: {
      compact: "80K",
      full: "80,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/jonsoc",
    discord: "https://discord.gg/jonsoc",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "600",
    commits: "7,500",
    monthlyUsers: "1.5M",
  },
} as const
