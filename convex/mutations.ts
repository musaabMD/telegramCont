import { mutation, query, internalMutation } from "./_generated/server";
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
        run_count: (existing.run_count ?? 0) + 1,
      });
    } else {
      await ctx.db.insert("scrape_log", {
        channel: args.channel,
        last_scrape_date: now,
        last_message_date: args.last_message_date,
        messages_scraped: args.messages_scraped,
        run_count: 1,
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

// ── AI Content (update processed fields on a text_message) ──

export const updateAiContent = mutation({
  args: {
    id: v.id("text_messages"),
    q_text: v.optional(v.string()),
    choices: v.optional(v.array(v.string())),
    correct_choice_index: v.optional(v.float64()),
    explanation: v.optional(v.string()),
    hy_summary: v.optional(v.string()),
    subject: v.optional(v.string()),
    topic: v.optional(v.string()),
    exam_name: v.optional(v.string()),
    ai_cost: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val;
    }
    patch.ai_status = "done";
    await ctx.db.patch(id, patch);
  },
});

// ── Comment (user notes on a text_message) ──────────────────

export const updateComment = mutation({
  args: {
    id: v.id("text_messages"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { comment: args.comment });
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

// ── Internal mutations (called from actions) ────────────────

export const saveScrapedMessages = internalMutation({
  args: {
    channel: v.string(),
    messages: v.array(
      v.object({
        message_id: v.number(),
        date: v.string(),
        text: v.string(),
        link: v.string(),
        is_forward: v.boolean(),
        word_count: v.number(),
        is_caption: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const msg of args.messages) {
      const existing = await ctx.db
        .query("text_messages")
        .withIndex("by_channel_message", (q) =>
          q.eq("channel", args.channel).eq("message_id", msg.message_id)
        )
        .first();
      if (!existing) {
        await ctx.db.insert("text_messages", { ...msg, channel: args.channel });
      }
    }
    return args.messages.length;
  },
});

// ── Coverage Tracking ─────────────────────────────────────

export const upsertScrapeDaysBatch = internalMutation({
  args: {
    channel: v.string(),
    days: v.array(v.object({
      date: v.string(),
      messages_found: v.float64(),
    })),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    for (const day of args.days) {
      const existing = await ctx.db
        .query("scrape_days")
        .withIndex("by_channel_date", (q) =>
          q.eq("channel", args.channel).eq("date", day.date)
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          messages_found: existing.messages_found + day.messages_found,
          scraped_at: now,
        });
      } else {
        await ctx.db.insert("scrape_days", {
          channel: args.channel,
          date: day.date,
          messages_found: day.messages_found,
          scraped_at: now,
        });
      }
    }
  },
});

export const getCoverageData = query({
  args: { channels: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, Array<{ date: string; messages_found: number; scraped_at: string }>> = {};
    for (const channel of args.channels) {
      const days = await ctx.db
        .query("scrape_days")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .collect();
      result[channel] = days
        .filter((d) => d.date >= "2025-01-01")
        .map((d) => ({ date: d.date, messages_found: d.messages_found, scraped_at: d.scraped_at }));
    }
    return result;
  },
});

export const getScrapeProgress = query({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scrape_progress")
      .withIndex("by_exam", (q) => q.eq("exam_id", args.examId))
      .first();
  },
});

export const createScrapeProgress = internalMutation({
  args: {
    exam_id: v.id("exams"),
    total_channels: v.float64(),
  },
  handler: async (ctx, args) => {
    // Delete existing progress for this exam
    const existing = await ctx.db
      .query("scrape_progress")
      .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return await ctx.db.insert("scrape_progress", {
      exam_id: args.exam_id,
      status: "running",
      started_at: new Date().toISOString(),
      total_channels: args.total_channels,
      channels_completed: 0,
      total_days_found: 0,
      total_messages_found: 0,
      log_entries: [],
    });
  },
});

export const updateScrapeProgress = internalMutation({
  args: {
    id: v.id("scrape_progress"),
    status: v.optional(v.string()),
    current_channel: v.optional(v.string()),
    current_page: v.optional(v.float64()),
    channels_completed: v.optional(v.float64()),
    total_days_found: v.optional(v.float64()),
    total_messages_found: v.optional(v.float64()),
    finished_at: v.optional(v.string()),
    error: v.optional(v.string()),
    log_entry: v.optional(v.object({
      timestamp: v.string(),
      channel: v.string(),
      message: v.string(),
      level: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { id, log_entry, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val;
    }
    if (log_entry) {
      const doc = await ctx.db.get(id);
      if (doc) {
        const entries = [...doc.log_entries, log_entry];
        patch.log_entries = entries.slice(-200);
      }
    }
    await ctx.db.patch(id, patch);
  },
});

export const backfillScrapeDays = mutation({
  args: {},
  handler: async (ctx) => {
    const allMessages = await ctx.db.query("text_messages").collect();
    const channelDateCounts: Record<string, Record<string, number>> = {};
    for (const msg of allMessages) {
      const ch = msg.channel;
      const d = msg.date.slice(0, 10);
      if (!channelDateCounts[ch]) channelDateCounts[ch] = {};
      channelDateCounts[ch][d] = (channelDateCounts[ch][d] || 0) + 1;
    }
    const now = new Date().toISOString();
    let count = 0;
    for (const [channel, dates] of Object.entries(channelDateCounts)) {
      for (const [date, msgCount] of Object.entries(dates)) {
        const existing = await ctx.db
          .query("scrape_days")
          .withIndex("by_channel_date", (q) =>
            q.eq("channel", channel).eq("date", date)
          )
          .first();
        if (!existing) {
          await ctx.db.insert("scrape_days", {
            channel,
            date,
            messages_found: msgCount,
            scraped_at: now,
          });
          count++;
        }
      }
    }
    return { backfilled: count };
  },
});

export const updateScrapeLogInternal = internalMutation({
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
        run_count: (existing.run_count ?? 0) + 1,
      });
    } else {
      await ctx.db.insert("scrape_log", {
        channel: args.channel,
        last_scrape_date: now,
        last_message_date: args.last_message_date,
        messages_scraped: args.messages_scraped,
        run_count: 1,
      });
    }
  },
});
