# Task 1: Usage + Rate Limit UX

## Goal

Expose accurate rate-limit details and a standalone Usage screen that only shows providers with real usage data.

## Steps

1. **Identify rate-limit metadata**
   - Inventory what provider responses already expose (retry-after, reset time, limit/remaining, etc.).
   - Choose a normalized `RateLimitInfo` shape for the client.

2. **Plumb rate-limit info into session status**
   - Extend session status models to include optional `rateLimit` details.
   - Wire provider/SDK status updates to populate it when available.

3. **Improve retry toast**
   - Prefer structured rate-limit info for the message.
   - Fall back to the raw server message if metadata is missing.
   - Include a short hint to open the Usage screen.

4. **Add a standalone Usage screen (like Settings)**
   - New route that lists providers with usage data only.
   - Show active provider/model summary at top.
   - For each provider, show limit, remaining, reset time, and retry-after if available.

5. **Add navigation + command**
   - Register a command to open the Usage screen from anywhere.
   - Add the keybind to help text/tips if appropriate.

## Constraints

- Hide providers without usage endpoints or known usage data.
- Avoid local estimates unless explicitly requested later.
