import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  shares: defineTable({
    // Unique share ID (ULID from CLI)
    slug: v.string(),
    // Secret for authentication (only share creator knows this)
    secret: v.string(),
    // Session metadata
    sessionID: v.string(),
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    // Visibility
    isPublic: v.boolean(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    // Soft delete
    isDeleted: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_secret", ["secret"])
    .index("by_session", ["sessionID"]),

  // Share data stored as JSON blobs (messages, diffs, etc)
  shareData: defineTable({
    shareID: v.id("shares"),
    // Type: "session" | "message" | "part" | "session_diff" | "model"
    dataType: v.string(),
    // Data ID (message ID, part ID, etc)
    dataID: v.string(),
    // JSON string of the actual data
    payload: v.string(),
    createdAt: v.number(),
  })
    .index("by_share", ["shareID"])
    .index("by_share_data", ["shareID", "dataType"])
    .index("by_data_id", ["dataID"]),
})
