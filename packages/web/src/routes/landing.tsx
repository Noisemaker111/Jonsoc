import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export const Route = createFileRoute("/landing")({
  component: LandingPage,
})

const GITHUB_REPO = "https://github.com/Noisemaker111/Jonsoc"

function LandingPage() {
  const [copied, setCopied] = useState(false)

  const copyInstallCommand = () => {
    navigator.clipboard.writeText("bun add -g jonsoc")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto max-w-6xl px-4 pt-20 pb-16">
        <div className="text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">jonsoc</h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            AI-powered development tool — an open source fork of OpenCode (opencode.ai)
          </p>

          {/* Install Command */}
          <div className="mx-auto mb-8 max-w-md">
            <div className="rounded-lg border bg-card p-4 font-mono text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <code className="text-primary">bun add -g jonsoc</code>
                <Button variant="ghost" size="sm" onClick={copyInstallCommand} className="h-8">
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Or use npm: <code className="rounded bg-muted px-1 py-0.5">npm install -g jonsoc</code>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
                View on GitHub
              </Button>
            </a>
            <a href="/dashboard">
              <Button variant="outline" size="lg" className="gap-2">
                Try Web App
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI-Powered Development
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Intelligent code assistance with multiple AI providers and models.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Terminal UI
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Built-in TUI with syntax highlighting, file browser, and session management.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Share your AI sessions with others via public links. Great for collaboration.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                Multiple Providers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Support for OpenAI, Anthropic, Google, and many more AI providers.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Open Source
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              MIT licensed. Forked from OpenCode with gratitude. Build with the community.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Your data stays local. Self-host the backend or use enterprise features.
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Downloads Section */}
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Download</h2>
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Installation Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted p-4">
                <p className="mb-2 font-medium">Via Bun (Recommended)</p>
                <code className="block rounded bg-background p-2 font-mono text-sm">bun add -g jonsoc</code>
              </div>
              <div className="rounded-lg border bg-muted p-4">
                <p className="mb-2 font-medium">Via npm</p>
                <code className="block rounded bg-background p-2 font-mono text-sm">npm install -g jonsoc</code>
              </div>
              <div className="rounded-lg border bg-muted p-4">
                <p className="mb-2 font-medium">Via curl (Linux/macOS)</p>
                <code className="block rounded bg-background p-2 font-mono text-sm">
                  curl -fsSL https://jonsoc.com/install | bash
                </code>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Supports: macOS (ARM64), Linux (x64), Windows (x64)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>Built with gratitude for the OpenCode team. MIT License.</p>
          <p className="mt-2">
            <a href={GITHUB_REPO} className="hover:text-primary hover:underline">
              GitHub
            </a>
            {" • "}
            <a href="/dashboard" className="hover:text-primary hover:underline">
              Dashboard
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
