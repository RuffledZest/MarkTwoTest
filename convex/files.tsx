import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
export const createNewFile = mutation({
  args: {
    fileName: v.string(),
    teamId: v.id("teams"),
    createdBy: v.string(),
    content: v.string(),
    whiteboard: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("files", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getFiles = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .order("desc")
      .collect();
  },
});

export const updateDocument = mutation({
  args: {
    _id: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args._id, { content: args.content });
  },
});

export const updateWhiteboard = mutation({
  args: {
    _id: v.id("files"),
    whiteboard: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args._id, { whiteboard: args.whiteboard });
  },
});

export const getFilebyId = query({
  args: {
    _id: v.id("files"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args._id);
  },
});
