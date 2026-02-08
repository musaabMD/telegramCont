import { mutation, query } from "./_generated/server";
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

// ── Scrape Log ──────────────────────────────────────────────

export const getLastScrape = query({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrape_log")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .first();
  },
});

export const updateScrapeLog = mutation({
  args: {
    channel: v.string(),
    last_message_date: v.string(),
    messages_scraped: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scrape_log")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .first();
    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        last_scrape_date: now,
        last_message_date: args.last_message_date,
        messages_scraped: args.messages_scraped,
      });
    } else {
      await ctx.db.insert("scrape_log", {
        channel: args.channel,
        last_scrape_date: now,
        last_message_date: args.last_message_date,
        messages_scraped: args.messages_scraped,
      });
    }
  },
});

// ── AI Status ──────────────────────────────────────────────

export const updateAiStatus = mutation({
  args: {
    table: v.string(), // "text_messages" | "pdfs_metadata" | "images_metadata"
    id: v.string(), // Convex document ID
    ai_status: v.string(), // "todo" | "in_progress" | "done"
  },
  handler: async (ctx, args) => {
    const docId = args.id as any;
    await ctx.db.patch(docId, { ai_status: args.ai_status });
  },
});

// ── Channel Health ─────────────────────────────────────────

export const getChannelHealth = query({
  args: { channels: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results = [];
    for (const channel of args.channels) {
      const health = await ctx.db
        .query("channel_health")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .first();
      results.push({ channel, health });
    }
    return results;
  },
});

// ── Scrape Logs (multi-channel) ─────────────────────────────

export const getScrapeLogsForChannels = query({
  args: { channels: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results = [];
    for (const channel of args.channels) {
      const log = await ctx.db
        .query("scrape_log")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .first();
      if (log) results.push(log);
    }
    return results;
  },
});

export const saveChannelHealth = mutation({
  args: {
    channel: v.string(),
    status: v.string(),
    message_count: v.optional(v.number()),
    latest_messages: v.optional(v.array(v.object({
      id: v.number(),
      date: v.string(),
      text: v.string(),
    }))),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("channel_health")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .first();
    const now = new Date().toISOString();
    const data = {
      channel: args.channel,
      status: args.status,
      last_check: now,
      message_count: args.message_count,
      latest_messages: args.latest_messages,
      error: args.error,
    };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("channel_health", data);
    }
  },
});
