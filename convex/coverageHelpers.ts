import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getExam = internalQuery({
  args: { id: v.id("exams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getOldestMessageId = internalQuery({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("text_messages")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .collect();
    if (messages.length === 0) return null;
    let oldest = messages[0].message_id;
    for (const m of messages) {
      if (m.message_id < oldest) oldest = m.message_id;
    }
    return oldest;
  },
});
