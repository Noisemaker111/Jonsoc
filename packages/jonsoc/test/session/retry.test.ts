import { describe, expect, test } from "bun:test"
import { SessionRetry } from "../../src/session/retry"
import { MessageV2 } from "../../src/session/message-v2"

function apiError(
  headers?: Record<string, string>,
  options?: {
    message?: string
    statusCode?: number
    responseBody?: string
  },
): MessageV2.APIError {
  const error = new MessageV2.APIError({
    message: options?.message ?? "boom",
    isRetryable: true,
    statusCode: options?.statusCode,
    responseHeaders: headers,
    responseBody: options?.responseBody,
  }).toObject()
  if (!MessageV2.APIError.isInstance(error)) {
    throw new Error("Invalid APIError fixture")
  }
  return error
}

describe("session.retry.delay", () => {
  test("caps delay at 30 seconds when headers missing", () => {
    const error = apiError()
    const delays = Array.from({ length: 10 }, (_, index) => SessionRetry.delay(index + 1, error))
    expect(delays).toStrictEqual([2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000, 30000])
  })

  test("prefers retry-after-ms when shorter than exponential", () => {
    const error = apiError({ "retry-after-ms": "1500" })
    expect(SessionRetry.delay(4, error)).toBe(1500)
  })

  test("uses retry-after seconds when reasonable", () => {
    const error = apiError({ "retry-after": "30" })
    expect(SessionRetry.delay(3, error)).toBe(30000)
  })

  test("accepts http-date retry-after values", () => {
    const date = new Date(Date.now() + 20000).toUTCString()
    const error = apiError({ "retry-after": date })
    const d = SessionRetry.delay(1, error)
    expect(d).toBeGreaterThanOrEqual(19000)
    expect(d).toBeLessThanOrEqual(20000)
  })

  test("ignores invalid retry hints", () => {
    const error = apiError({ "retry-after": "not-a-number" })
    expect(SessionRetry.delay(1, error)).toBe(2000)
  })

  test("ignores malformed date retry hints", () => {
    const error = apiError({ "retry-after": "Invalid Date String" })
    expect(SessionRetry.delay(1, error)).toBe(2000)
  })

  test("ignores past date retry hints", () => {
    const pastDate = new Date(Date.now() - 5000).toUTCString()
    const error = apiError({ "retry-after": pastDate })
    expect(SessionRetry.delay(1, error)).toBe(2000)
  })

  test("uses retry-after values even when exceeding 10 minutes with headers", () => {
    const error = apiError({ "retry-after": "50" })
    expect(SessionRetry.delay(1, error)).toBe(50000)

    const longError = apiError({ "retry-after-ms": "700000" })
    expect(SessionRetry.delay(1, longError)).toBe(700000)
  })

  test("sleep caps delay to max 32-bit signed integer to avoid TimeoutOverflowWarning", async () => {
    const controller = new AbortController()

    const warnings: string[] = []
    const originalWarn = process.emitWarning
    process.emitWarning = (warning: string | Error) => {
      warnings.push(typeof warning === "string" ? warning : warning.message)
    }

    const promise = SessionRetry.sleep(2_560_914_000, controller.signal)
    controller.abort()

    try {
      await promise
    } catch {}

    process.emitWarning = originalWarn
    expect(warnings.some((w) => w.includes("TimeoutOverflowWarning"))).toBe(false)
  })
})

describe("session.retry.rate-limit", () => {
  test("extracts retry-after and reset headers", () => {
    const now = 1_700_000_000_000
    const error = apiError({ "retry-after": "30", "x-ratelimit-reset-requests": "2m" })
    const info = SessionRetry.rateLimitInfo(error, now)
    expect(info?.retryAfterMs).toBe(30_000)
    expect(info?.resetAt).toBe(now + 120_000)
  })

  test("extracts rate limit info from response body", () => {
    const now = 1_700_000_000_000
    const body = JSON.stringify({
      error: {
        message: "Rate limit exceeded",
        retry_after: 3600,
        limit: 1000,
        remaining: 0,
        scope: "requests",
      },
    })
    const error = apiError(undefined, { responseBody: body, statusCode: 429, message: "Rate limit exceeded" })
    const info = SessionRetry.rateLimitInfo(error, now)
    expect(info?.retryAfterMs).toBe(3_600_000)
    expect(info?.limit).toBe(1000)
    expect(info?.remaining).toBe(0)
    expect(info?.scope).toBe("requests")
  })

  test("parses retry hints from error message", () => {
    const now = 1_700_000_000_000
    const error = apiError(undefined, { message: "Rate limit exceeded. Please try again in 8 hours." })
    const info = SessionRetry.rateLimitInfo(error, now)
    expect(info?.retryAfterMs).toBe(28_800_000)
    expect(info?.resetAt).toBe(now + 28_800_000)
  })

  test("parses retry-after message variants", () => {
    const now = 1_700_000_000_000
    const retryAfter = apiError(undefined, { message: "Rate limit exceeded. Retry after 8 hours." })
    const retryAfterInfo = SessionRetry.rateLimitInfo(retryAfter, now)
    expect(retryAfterInfo?.retryAfterMs).toBe(28_800_000)

    const shortHand = apiError(undefined, { message: "Rate limit exceeded. Try again in 2h30m." })
    const shortHandInfo = SessionRetry.rateLimitInfo(shortHand, now)
    expect(shortHandInfo?.retryAfterMs).toBe(9_000_000)
  })

  test("parses retry date from error message", () => {
    const now = 1_700_000_000_000
    const resetAt = new Date(now + 3_600_000).toISOString()
    const error = apiError(undefined, { message: `Rate limit exceeded. Please try again at ${resetAt}.` })
    const info = SessionRetry.rateLimitInfo(error, now)
    expect(info?.retryAfterMs).toBe(3_600_000)
    expect(info?.resetAt).toBe(now + 3_600_000)
  })

  test("stops retrying on long cooldowns", () => {
    const error = apiError(undefined, { message: "Rate limit exceeded", statusCode: 429 })
    const info = { retryAfterMs: SessionRetry.RETRY_STOP_THRESHOLD_MS + 1000 }
    const shouldStop = SessionRetry.shouldStopRetry(info.retryAfterMs, error, info)
    expect(shouldStop).toBe(true)
  })
})

describe("session.message-v2.fromError", () => {
  test.concurrent(
    "converts ECONNRESET socket errors to retryable APIError",
    async () => {
      using server = Bun.serve({
        port: 0,
        idleTimeout: 8,
        async fetch(req) {
          return new Response(
            new ReadableStream({
              async pull(controller) {
                controller.enqueue("Hello,")
                await Bun.sleep(10000)
                controller.enqueue(" World!")
                controller.close()
              },
            }),
            { headers: { "Content-Type": "text/plain" } },
          )
        },
      })

      const error = await fetch(new URL("/", server.url.origin))
        .then((res) => res.text())
        .catch((e) => e)

      const result = MessageV2.fromError(error, { providerID: "test" })

      expect(MessageV2.APIError.isInstance(result)).toBe(true)
      expect((result as MessageV2.APIError).data.isRetryable).toBe(true)
      expect((result as MessageV2.APIError).data.message).toBe("Connection reset by server")
      expect((result as MessageV2.APIError).data.metadata?.code).toBe("ECONNRESET")
      expect((result as MessageV2.APIError).data.metadata?.message).toInclude("socket connection")
    },
    15_000,
  )

  test("ECONNRESET socket error is retryable", () => {
    const error = new MessageV2.APIError({
      message: "Connection reset by server",
      isRetryable: true,
      metadata: { code: "ECONNRESET", message: "The socket connection was closed unexpectedly" },
    }).toObject() as MessageV2.APIError

    const retryable = SessionRetry.retryable(error)
    expect(retryable).toBeDefined()
    expect(retryable).toBe("Connection reset by server")
  })
})
