import type { GenericQueryCtx } from "convex/server"

import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import { authComponent } from "./auth"

export const get = query({
  args: {},
  handler: async (ctx: GenericQueryCtx<DataModel>) => {
    const authUser = await authComponent.safeGetAuthUser(ctx as any)
    if (!authUser) {
      return {
        message: "Not authenticated",
      }
    }
    return {
      message: "This is private",
    }
  },
})
