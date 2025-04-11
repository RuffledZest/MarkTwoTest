import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createTeam = mutation({
  args: {
    teamName: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.createdBy))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const teamId = await ctx.db.insert("teams", {
      teamName: args.teamName,
      createdBy: args.createdBy,
      members: [args.createdBy],
      createdAt: Date.now(),
    });

    return teamId;
  },
});

export const getTeamsByUser = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .filter((q) => q.eq(q.field("createdBy"), args.walletAddress))
      .collect();
  },
});

export const inviteUser = mutation({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    invitedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    const invitedUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!invitedUser) {
      throw new Error("User not found");
    }

    await ctx.db.insert("invites", {
      teamId: args.teamId,
      email: args.email,
      invitedBy: args.invitedBy,
      status: "pending",
      createdAt: Date.now(),
    });
  },
}); 