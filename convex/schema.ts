import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    walletAddress: v.string(),
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_wallet", ["walletAddress"]),
  
  teams: defineTable({
    teamName: v.string(),
    createdBy: v.string(),
    members: v.array(v.string()),
    createdAt: v.number(),
  }),

  files: defineTable({
    fileName: v.string(),
    teamId: v.id("teams"),
    createdBy: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }),

  invites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    invitedBy: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
}); 