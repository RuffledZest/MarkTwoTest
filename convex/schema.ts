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
    teamName: v.optional(v.string()),
    name: v.optional(v.string()),
    createdBy: v.string(),
    members: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  }),

  files: defineTable({
    fileName: v.string(),
    teamId: v.id("teams"),
    createdBy: v.string(),
    content: v.optional(v.string()),
    whiteboard: v.optional(v.string()),
    document: v.optional(v.string()),
    archieved: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  }),

  invitations: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    invitedBy: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_email", ["email"]),
}); 