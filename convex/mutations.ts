import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveTextMessages = mutation({
  args: {
    channel: v.string(),
    messages: v.array(
      v.object({
        message_id: v.number(),
        date: v.string(),
        text: v.string(),
        views: v.optional(v.number()),
        link: v.string(),
        is_forward: v.boolean(),
        word_count: v.number(),
        is_caption: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const msg of args.messages) {
      // Check if message already exists
      const existing = await ctx.db
        .query("text_messages")
        .withIndex("by_channel_message", (q) =>
          q.eq("channel", args.channel).eq("message_id", msg.message_id)
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, msg);
      } else {
        await ctx.db.insert("text_messages", { ...msg, channel: args.channel });
      }
    }
    return args.messages.length;
  },
});

export const saveSummary = mutation({
  args: {
    channel: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("summary")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("summary", {
        channel: args.channel,
        content: args.content,
      });
    }
  },
});

export const savePdfsMetadata = mutation({
  args: {
    channel: v.string(),
    pdfs: v.array(
      v.object({
        message_id: v.number(),
        filename: v.string(),
        original_name: v.optional(v.string()),
        file_size: v.optional(v.number()),
        date: v.optional(v.string()),
        link: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const pdf of args.pdfs) {
      await ctx.db.insert("pdfs_metadata", { ...pdf, channel: args.channel });
    }
    return args.pdfs.length;
  },
});

export const saveImagesMetadata = mutation({
  args: {
    channel: v.string(),
    images: v.array(
      v.object({
        message_id: v.number(),
        filename: v.string(),
        caption: v.optional(v.string()),
        file_size: v.optional(v.number()),
        date: v.optional(v.string()),
        link: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const img of args.images) {
      await ctx.db.insert("images_metadata", { ...img, channel: args.channel });
    }
    return args.images.length;
  },
});
