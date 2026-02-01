import { createFileRoute, useParams } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { api } from "@jonsoc/convex"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/share/$id")({
  component: ShareViewerPage,
})

function ShareViewerPage() {
  const { id } = useParams({ from: "/share/$id" })
  const shareData = useQuery(api.share.getPublic, { slug: id })

  if (shareData === undefined) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (shareData === null) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Share Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This share link is invalid, has been deleted, or is not public.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group data by type
  const session = shareData.data.find((d: any) => d.type === "session")?.data
  const messages = shareData.data
    .filter((d: any) => d.type === "message")
    .sort((a: any, b: any) => {
      const aTime = a.data?.createdAt || 0
      const bTime = b.data?.createdAt || 0
      return aTime - bTime
    })
  const diffs = shareData.data.find((d: any) => d.type === "session_diff")?.data || []

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Share Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{session?.title || "Untitled Session"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>ID: {shareData.id}</span>
            <span>Created: {new Date(shareData.createdAt).toLocaleString()}</span>
            {shareData.model && <span>Model: {shareData.model}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {messages.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.map((msg: any, idx: number) => (
              <div
                key={idx}
                className={`rounded-lg border p-4 ${
                  msg.data?.role === "user"
                    ? "bg-muted ml-8"
                    : msg.data?.role === "assistant"
                      ? "bg-card mr-8"
                      : "bg-card"
                }`}
              >
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  {msg.data?.role || "unknown"}
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">{msg.data?.content || "[No content]"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* File Changes */}
      {diffs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File Changes ({diffs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {diffs.map((diff: any, idx: number) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      diff.status === "added"
                        ? "bg-green-500"
                        : diff.status === "deleted"
                          ? "bg-red-500"
                          : diff.status === "modified"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                    }`}
                  />
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">{diff.path}</code>
                  <span className="text-muted-foreground">({diff.status})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Shared via jonsoc •{" "}
          <a
            href="https://github.com/Noisemaker111/Jonsoc"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  )
}
