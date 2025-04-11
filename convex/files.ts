import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createFile = mutation({
  args: {
    fileName: v.string(),
    teamId: v.id("teams"),
    createdBy: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.createdBy))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    if (!team.members.includes(args.createdBy)) {
      throw new Error("User is not a member of this team");
    }

    const fileId = await ctx.db.insert("files", {
      fileName: args.fileName,
      teamId: args.teamId,
      createdBy: args.createdBy,
      content: args.content,
      createdAt: Date.now(),
    });

    return fileId;
  },
});

export const getFilesByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();
  },
}); 