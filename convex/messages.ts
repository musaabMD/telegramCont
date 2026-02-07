import { query } from "./_generated/server";
import { v } from "convex/values";

export const getTextMessages = query({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("text_messages")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .collect();
    messages.sort((a, b) => b.message_id - a.message_id);
    return messages;
  },
});

export const getSummary = query({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("summary")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .first();
    return doc?.content ?? "";
  },
});

export const getPdfs = query({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pdfs_metadata")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .collect();
  },
});

export const getImages = query({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("images_metadata")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .collect();
  },
});

export const getCounts = query({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    const text = await ctx.db
      .query("text_messages")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .collect();
    const pdfs = await ctx.db
      .query("pdfs_metadata")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .collect();
    const images = await ctx.db
      .query("images_metadata")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .collect();
    return { text: text.length, pdfs: pdfs.length, images: images.length };
  },
});

export const getCountsMulti = query({
  args: { channels: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, { text: number; pdfs: number; images: number }> = {};
    for (const channel of args.channels) {
      const text = await ctx.db
        .query("text_messages")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .collect();
      const pdfs = await ctx.db
        .query("pdfs_metadata")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .collect();
      const images = await ctx.db
        .query("images_metadata")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .collect();
      result[channel] = { text: text.length, pdfs: pdfs.length, images: images.length };
    }
    return result;
  },
});
