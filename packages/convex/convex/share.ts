import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const create = mutation({
  args: {
    sessionID: v.string(),
    slug: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if share already exists for this session
    const existing = await ctx.db
      .query("shares")
      .withIndex("by_session", (q) => q.eq("sessionID", args.sessionID))
      .first()

    if (existing) {
      // Return existing share
      return {
        id: existing.slug,
        url: `/share/${existing.slug}`,
        secret: existing.secret,
      }
    }

    // Create new share
    const share = await ctx.db.insert("shares", {
      slug: args.slug,
      secret: args.secret,
      sessionID: args.sessionID,
      title: undefined,
      model: undefined,
      isPublic: true,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    })

    return {
      id: args.slug,
      url: `/share/${args.slug}`,
      secret: args.secret,
    }
  },
})

export const sync = mutation({
  args: {
    slug: v.string(),
    secret: v.string(),
    data: v.array(
      v.object({
        type: v.string(),
        data: v.any(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Verify share exists and secret matches
    const share = await ctx.db
      .query("shares")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!share || share.secret !== args.secret) {
      throw new Error("Share not found or invalid secret")
    }

    if (share.isDeleted) {
      throw new Error("Share has been deleted")
    }

    // Process each data item
    for (const item of args.data) {
      const dataID = item.data?.id || crypto.randomUUID()
      const payload = JSON.stringify(item.data)

      // Check if data already exists
      const existing = await ctx.db
        .query("shareData")
        .withIndex("by_data_id", (q) => q.eq("dataID", dataID))
        .first()

      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          payload,
          createdAt: Date.now(),
        })
      } else {
        // Create new
        await ctx.db.insert("shareData", {
          shareID: share._id,
          dataType: item.type,
          dataID,
          payload,
          createdAt: Date.now(),
        })
      }

      // Update share title/model if provided
      if (item.type === "session") {
        const sessionData = item.data
        if (sessionData?.title) {
          await ctx.db.patch(share._id, {
            title: sessionData.title,
            updatedAt: Date.now(),
          })
        }
      }
    }

    // Update share timestamp
    await ctx.db.patch(share._id, {
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

export const remove = mutation({
  args: {
    slug: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!share || share.secret !== args.secret) {
      throw new Error("Share not found or invalid secret")
    }

    // Soft delete
    await ctx.db.patch(share._id, {
      isDeleted: true,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

export const get = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!share || share.isDeleted || !share.isPublic) {
      return null
    }

    // Get all share data
    const data = await ctx.db
      .query("shareData")
      .withIndex("by_share", (q) => q.eq("shareID", share._id))
      .collect()

    return {
      id: share.slug,
      sessionID: share.sessionID,
      title: share.title,
      model: share.model,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
      data: data.map((d) => ({
        type: d.dataType,
        id: d.dataID,
        data: JSON.parse(d.payload),
      })),
    }
  },
})

export const getPublic = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Reuse get logic
    const share = await ctx.db
      .query("shares")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!share || share.isDeleted || !share.isPublic) {
      return null
    }

    // Get all share data
    const data = await ctx.db
      .query("shareData")
      .withIndex("by_share", (q) => q.eq("shareID", share._id))
      .collect()

    return {
      id: share.slug,
      sessionID: share.sessionID,
      title: share.title,
      model: share.model,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
      data: data.map((d) => ({
        type: d.dataType,
        id: d.dataID,
        data: JSON.parse(d.payload),
      })),
    }
  },
})
