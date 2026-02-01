import { httpRouter } from "convex/server"
import type { HttpRouter } from "convex/server"

import { authComponent, createAuth } from "./auth"

const http: HttpRouter = httpRouter()

authComponent.registerRoutes(http, createAuth, { cors: true })

// Share API endpoints - POST /api/share
http.route({
  path: "/api/share",
  method: "POST",
  handler: async (ctx, request) => {
    try {
      const body = await request.json()

      // Import the share module dynamically
      const { create } = await import("./share")

      const result = await ctx.runMutation(create, {
        sessionID: body.sessionID,
        slug: body.sessionID, // Use sessionID as slug
        secret: generateSecret(),
      })

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }
  },
})

// Share sync endpoint - POST /api/share/:slug/sync
http.route({
  path: "/api/share/:slug/sync",
  method: "POST",
  handler: async (ctx, request) => {
    try {
      const slug = request.params.slug
      const body = await request.json()

      const { sync } = await import("./share")

      await ctx.runMutation(sync, {
        slug,
        secret: body.secret,
        data: body.data,
      })

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }
  },
})

// Share delete endpoint - DELETE /api/share/:slug
http.route({
  path: "/api/share/:slug",
  method: "DELETE",
  handler: async (ctx, request) => {
    try {
      const slug = request.params.slug
      const body = await request.json()

      const { remove } = await import("./share")

      await ctx.runMutation(remove, {
        slug,
        secret: body.secret,
      })

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }
  },
})

// Share get endpoint - GET /api/share/:slug
http.route({
  path: "/api/share/:slug",
  method: "GET",
  handler: async (ctx, request) => {
    try {
      const slug = request.params.slug

      const { getPublic } = await import("./share")

      const result = await ctx.runQuery(getPublic, { slug })

      if (!result) {
        return new Response(JSON.stringify({ error: "Share not found" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        })
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }
  },
})

// CORS preflight for share endpoints
http.route({
  path: "/api/share",
  method: "OPTIONS",
  handler: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  },
})

http.route({
  path: "/api/share/:slug",
  method: "OPTIONS",
  handler: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  },
})

http.route({
  path: "/api/share/:slug/sync",
  method: "OPTIONS",
  handler: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  },
})

function generateSecret(): string {
  // Generate a random UUID-like string
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default http
