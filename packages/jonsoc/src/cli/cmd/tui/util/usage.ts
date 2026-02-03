import z from "zod"
import { SessionStatus } from "@/session/status"

export const UsageEntrySchema = z.object({
  providerID: z.string(),
  modelID: z.string().optional(),
  message: z.string().optional(),
  status: z.enum(["retry", "rate-limited"]),
  updatedAt: z.number(),
  rateLimit: SessionStatus.RateLimit.optional(),
})

export const UsageCacheSchema = z.record(z.string(), UsageEntrySchema)

export type UsageEntry = z.infer<typeof UsageEntrySchema>
export type UsageCache = z.infer<typeof UsageCacheSchema>

export function parseUsageCache(value: unknown): UsageCache {
  const parsed = UsageCacheSchema.safeParse(value)
  if (parsed.success) return parsed.data
  return {}
}

export function mergeRateLimit(
  current?: SessionStatus.RateLimit,
  update?: SessionStatus.RateLimit,
): SessionStatus.RateLimit | undefined {
  if (!current && !update) return undefined
  return {
    retryAfterMs: update?.retryAfterMs ?? current?.retryAfterMs,
    resetAt: update?.resetAt ?? current?.resetAt,
    limit: update?.limit ?? current?.limit,
    remaining: update?.remaining ?? current?.remaining,
    scope: update?.scope ?? current?.scope,
  }
}
