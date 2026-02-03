import type { NamedError } from "@jonsoc/util/error"
import { MessageV2 } from "./message-v2"
import type { SessionStatus } from "./status"

export namespace SessionRetry {
  export const RETRY_INITIAL_DELAY = 2000
  export const RETRY_BACKOFF_FACTOR = 2
  export const RETRY_MAX_DELAY_NO_HEADERS = 30_000 // 30 seconds
  export const RETRY_MAX_DELAY = 2_147_483_647 // max 32-bit signed integer for setTimeout
  export const RETRY_STOP_THRESHOLD_MS = 5 * 60 * 1000

  export async function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const abortHandler = () => {
        clearTimeout(timeout)
        reject(new DOMException("Aborted", "AbortError"))
      }
      const timeout = setTimeout(
        () => {
          signal.removeEventListener("abort", abortHandler)
          resolve()
        },
        Math.min(ms, RETRY_MAX_DELAY),
      )
      signal.addEventListener("abort", abortHandler, { once: true })
    })
  }

  export function delay(attempt: number, error?: MessageV2.APIError) {
    if (error) {
      const headers = error.data.responseHeaders
      if (headers) {
        const retryAfterMs = parseRetryAfterMs(headers, Date.now())
        if (retryAfterMs !== undefined) {
          return retryAfterMs
        }

        return RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, attempt - 1)
      }
    }

    return Math.min(RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, attempt - 1), RETRY_MAX_DELAY_NO_HEADERS)
  }

  export function rateLimitInfo(
    error: ReturnType<NamedError["toObject"]>,
    now = Date.now(),
  ): SessionStatus.RateLimit | undefined {
    if (!MessageV2.APIError.isInstance(error)) return
    const headers = error.data.responseHeaders
    const responseBody = error.data.responseBody
    const limitFromHeaders = headers ? findRateLimitLimit(headers) : undefined
    const remainingFromHeaders = headers ? findRateLimitRemaining(headers) : undefined
    const resetAtFromHeaders = headers ? findRateLimitReset(headers, now) : undefined
    const retryAfterMsFromHeaders = headers ? parseRetryAfterMs(headers, now) : undefined
    const bodyInfo = responseBody ? parseRateLimitFromBody(responseBody, now) : undefined
    const messageInfo = parseRateLimitFromMessage(error.data.message, now)

    const retryAfterMs = retryAfterMsFromHeaders ?? bodyInfo?.retryAfterMs ?? messageInfo?.retryAfterMs ?? undefined
    const resetAt = resetAtFromHeaders ?? bodyInfo?.resetAt
    const limit = limitFromHeaders ?? bodyInfo?.limit
    const remaining = remainingFromHeaders ?? bodyInfo?.remaining
    const scope = bodyInfo?.scope ?? findRateLimitScope(headers)

    if (
      retryAfterMs === undefined &&
      resetAt === undefined &&
      limit === undefined &&
      remaining === undefined &&
      scope === undefined
    )
      return

    return {
      retryAfterMs,
      resetAt,
      limit,
      remaining,
      scope,
    }
  }

  export function isRateLimit(error: ReturnType<NamedError["toObject"]>): boolean {
    if (MessageV2.APIError.isInstance(error)) {
      if (error.data.statusCode === 429) return true
      const message = error.data.message.toLowerCase()
      if (message.includes("rate limit")) return true
      if (message.includes("too many requests")) return true
      if (message.includes("quota")) return true
      const body = error.data.responseBody
      if (body) {
        const parsed = parseRateLimitFromBody(body, Date.now())
        if (parsed) return true
      }
    }

    if (typeof error.data?.message === "string") {
      const message = error.data.message.toLowerCase()
      if (message.includes("rate limit")) return true
      if (message.includes("too many requests")) return true
      if (message.includes("quota")) return true
    }

    return false
  }

  export function shouldStopRetry(
    delayMs: number,
    error: ReturnType<NamedError["toObject"]>,
    info?: SessionStatus.RateLimit,
  ) {
    if (!isRateLimit(error)) return false
    const waitMs = info?.retryAfterMs ?? delayMs
    return waitMs >= RETRY_STOP_THRESHOLD_MS
  }

  export function retryable(error: ReturnType<NamedError["toObject"]>) {
    if (MessageV2.APIError.isInstance(error)) {
      if (!error.data.isRetryable) return undefined
      return error.data.message.includes("Overloaded") ? "Provider is overloaded" : error.data.message
    }

    if (typeof error.data?.message === "string") {
      try {
        const json = JSON.parse(error.data.message)
        if (json.type === "error" && json.error?.type === "too_many_requests") {
          return "Too Many Requests"
        }
        if (json.code.includes("exhausted") || json.code.includes("unavailable")) {
          return "Provider is overloaded"
        }
        if (json.type === "error" && json.error?.code?.includes("rate_limit")) {
          return "Rate Limited"
        }
        if (
          json.error?.message?.includes("no_kv_space") ||
          (json.type === "error" && json.error?.type === "server_error") ||
          !!json.error
        ) {
          return "Provider Server Error"
        }
      } catch {}
    }

    return undefined
  }

  function parseRetryAfterMs(headers: Record<string, string>, now: number) {
    const normalized = normalizeHeaders(headers)
    const retryAfterMs = normalized["retry-after-ms"]
    if (retryAfterMs) {
      const parsedMs = Number.parseFloat(retryAfterMs)
      if (!Number.isNaN(parsedMs)) {
        return parsedMs
      }
    }

    const retryAfter = normalized["retry-after"]
    if (retryAfter) {
      const parsedSeconds = Number.parseFloat(retryAfter)
      if (!Number.isNaN(parsedSeconds)) {
        return Math.ceil(parsedSeconds * 1000)
      }
      const parsedDate = Date.parse(retryAfter)
      if (!Number.isNaN(parsedDate) && parsedDate > now) {
        return Math.ceil(parsedDate - now)
      }
    }

    return undefined
  }

  function normalizeHeaders(headers: Record<string, string>) {
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value
    }
    return normalized
  }

  function parseRateLimitFromBody(body: string, now: number) {
    try {
      const parsed = JSON.parse(body) as {
        error?: {
          type?: string
          code?: string
          message?: string
          retry_after?: number | string
          retry_after_ms?: number | string
          reset?: number | string
          reset_at?: number | string
          limit?: number | string
          remaining?: number | string
          scope?: string
        }
        retry_after?: number | string
        retry_after_ms?: number | string
        reset?: number | string
        reset_at?: number | string
        limit?: number | string
        remaining?: number | string
        scope?: string
      }
      const source = parsed.error ?? parsed
      const retryAfterMs = parseRetryAfterValue(source.retry_after_ms ?? source.retry_after, now)
      const resetAt = parseResetValue(source.reset_at ?? source.reset, now)
      const limit = parseNumber(source.limit)
      const remaining = parseNumber(source.remaining)
      const scope = typeof source.scope === "string" ? source.scope : undefined

      if (
        retryAfterMs === undefined &&
        resetAt === undefined &&
        limit === undefined &&
        remaining === undefined &&
        scope === undefined
      )
        return undefined

      return {
        retryAfterMs,
        resetAt,
        limit,
        remaining,
        scope,
      }
    } catch {
      return undefined
    }
  }

  function parseRateLimitFromMessage(message: string, now: number) {
    const durationRegex =
      /(retry|try) again (?:in|after) (\d+(?:\.\d+)?)\s*(ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)/i
    const durationMatch = message.match(durationRegex)
    if (durationMatch) {
      const amount = Number.parseFloat(durationMatch[2])
      if (!Number.isNaN(amount)) {
        const unit = durationMatch[3].toLowerCase()
        const multiplier = unit.startsWith("ms")
          ? 1
          : unit.startsWith("s")
            ? 1000
            : unit.startsWith("m")
              ? 60_000
              : unit.startsWith("h")
                ? 3_600_000
                : 86_400_000
        const retryAfterMs = Math.max(0, Math.round(amount * multiplier))
        return {
          retryAfterMs,
          resetAt: now + retryAfterMs,
        }
      }
    }

    const shorthandRegex = /(retry|try) again (?:in|after)\s+((?:\d+(?:\.\d+)?\s*(?:ms|s|m|h|d)\s*)+)/i
    const shorthandMatch = message.match(shorthandRegex)
    if (shorthandMatch) {
      const duration = parseDurationMs(shorthandMatch[2])
      if (duration !== undefined) {
        return {
          retryAfterMs: duration,
          resetAt: now + duration,
        }
      }
    }

    const dateRegex = /(retry|try) again (?:at|after|on)\s+([^\.\n]+)/i
    const dateMatch = message.match(dateRegex)
    if (dateMatch) {
      const candidate = dateMatch[2].trim().replace(/[)\],;]+$/, "")
      const parsedDate = Date.parse(candidate)
      if (!Number.isNaN(parsedDate) && parsedDate > now) {
        return {
          retryAfterMs: parsedDate - now,
          resetAt: parsedDate,
        }
      }
    }

    return undefined
  }

  function findRateLimitReset(headers: Record<string, string>, now: number) {
    const normalized = normalizeHeaders(headers)
    const resetHeader = findHeaderValue(normalized, [
      "ratelimit-reset",
      "x-ratelimit-reset-requests",
      "x-ratelimit-reset-tokens",
      "x-ratelimit-reset",
      "anthropic-ratelimit-reset",
    ])
    if (!resetHeader) return undefined
    return parseResetValue(resetHeader, now)
  }

  function findRateLimitLimit(headers: Record<string, string>) {
    const normalized = normalizeHeaders(headers)
    const limitHeader = findHeaderValue(normalized, [
      "ratelimit-limit",
      "x-ratelimit-limit-requests",
      "x-ratelimit-limit-tokens",
      "x-ratelimit-limit",
      "anthropic-ratelimit-requests-limit",
      "anthropic-ratelimit-tokens-limit",
    ])
    return parseNumber(limitHeader)
  }

  function findRateLimitRemaining(headers: Record<string, string>) {
    const normalized = normalizeHeaders(headers)
    const remainingHeader = findHeaderValue(normalized, [
      "ratelimit-remaining",
      "x-ratelimit-remaining-requests",
      "x-ratelimit-remaining-tokens",
      "x-ratelimit-remaining",
      "anthropic-ratelimit-requests-remaining",
      "anthropic-ratelimit-tokens-remaining",
    ])
    return parseNumber(remainingHeader)
  }

  function findRateLimitScope(headers?: Record<string, string>) {
    if (!headers) return undefined
    const normalized = normalizeHeaders(headers)
    const scope = findHeaderValue(normalized, ["ratelimit-scope", "x-ratelimit-scope", "anthropic-ratelimit-scope"])
    return scope
  }

  function findHeaderValue(headers: Record<string, string>, keys: string[]) {
    for (const key of keys) {
      if (headers[key]) return headers[key]
    }
    return undefined
  }

  function parseRetryAfterValue(value: unknown, now: number) {
    if (value === undefined || value === null) return undefined
    if (typeof value === "number") {
      return value >= 0 ? Math.round(value) : undefined
    }
    if (typeof value === "string") {
      const numeric = Number.parseFloat(value)
      if (!Number.isNaN(numeric)) {
        return Math.round(numeric * 1000)
      }
      const parsedDate = Date.parse(value)
      if (!Number.isNaN(parsedDate) && parsedDate > now) {
        return parsedDate - now
      }
    }
    return undefined
  }

  function parseResetValue(value: unknown, now: number) {
    if (value === undefined || value === null) return undefined
    if (typeof value === "number") {
      return normalizeResetTime(value, now)
    }
    if (typeof value === "string") {
      const durationMs = parseDurationMs(value)
      if (durationMs !== undefined) return now + durationMs
      const numeric = Number.parseFloat(value)
      if (!Number.isNaN(numeric)) return normalizeResetTime(numeric, now)
      const parsedDate = Date.parse(value)
      if (!Number.isNaN(parsedDate)) return parsedDate
    }
    return undefined
  }

  function normalizeResetTime(value: number, now: number) {
    if (value > 1e12) return Math.round(value)
    if (value > 1e9) return Math.round(value * 1000)
    return now + Math.round(value * 1000)
  }

  function parseDurationMs(value: string) {
    const regex = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/g
    let match: RegExpExecArray | null
    let total = 0
    let found = false
    while ((match = regex.exec(value)) !== null) {
      const amount = Number.parseFloat(match[1])
      if (Number.isNaN(amount)) continue
      const unit = match[2]
      const multiplier =
        unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000
      total += amount * multiplier
      found = true
    }
    if (found) return Math.round(total)
    return undefined
  }

  function parseNumber(value?: string | number | null) {
    if (value === undefined || value === null) return undefined
    const numeric = typeof value === "number" ? value : Number.parseFloat(value)
    if (Number.isNaN(numeric)) return undefined
    return numeric
  }
}
