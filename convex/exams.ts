import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Normalize channel input to bare username (mirrors Python _clean_channel). */
function cleanChannel(raw: string): string {
  let s = raw.trim();
  for (const prefix of [
    "https://t.me/s/",
    "http://t.me/s/",
    "https://t.me/",
    "http://t.me/",
  ]) {
    if (s.toLowerCase().startsWith(prefix)) {
      s = s.slice(prefix.length);
      break;
    }
  }
  return s.replace(/^@/, "").replace(/\/+$/, "").trim();
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("exams").collect();
  },
});

export const get = query({
  args: { id: v.id("exams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    channels: v.array(v.string()),
    status: v.string(),
    inclusion_criteria: v.array(v.string()),
    exclusion_criteria: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("exams", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("exams"),
    name: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    inclusion_criteria: v.optional(v.array(v.string())),
    exclusion_criteria: v.optional(v.array(v.string())),
    ai_prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("exams") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get all unique channels across all exams (for channel picker)
export const getAllChannels = query({
  args: {},
  handler: async (ctx) => {
    const exams = await ctx.db.query("exams").collect();
    const channelSet = new Set<string>();
    for (const exam of exams) {
      for (const ch of exam.channels) {
        channelSet.add(ch);
      }
    }
    return Array.from(channelSet).sort();
  },
});

// Get per-channel counts for an exam (for Channels tab & Analytics)
export const getPerChannelCounts = query({
  args: { channels: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: { channel: string; text: number; pdfs: number; images: number }[] = [];
    for (const rawChannel of args.channels) {
      const channel = cleanChannel(rawChannel);
      const texts = await ctx.db
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
      results.push({ channel, text: texts.length, pdfs: pdfs.length, images: images.length });
    }
    return results;
  },
});

// Get counts for an exam's channels with optional date filtering
export const getExamCounts = query({
  args: {
    channels: v.array(v.string()),
    filter: v.optional(v.string()), // "today" | "week" | "month" | "all"
  },
  handler: async (ctx, args) => {
    let textCount = 0;
    let pdfCount = 0;
    let imageCount = 0;

    const now = new Date();
    let cutoff: string | null = null;

    if (args.filter === "today") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      cutoff = d.toISOString().split("T")[0];
    } else if (args.filter === "week") {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      cutoff = d.toISOString().split("T")[0];
    } else if (args.filter === "month") {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      cutoff = d.toISOString().split("T")[0];
    }

    for (const rawChannel of args.channels) {
      const channel = cleanChannel(rawChannel);
      const texts = await ctx.db
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

      if (cutoff) {
        textCount += texts.filter((t) => t.date >= cutoff!).length;
        pdfCount += pdfs.filter((p) => p.date && p.date >= cutoff!).length;
        imageCount += images.filter((i) => i.date && i.date >= cutoff!).length;
      } else {
        textCount += texts.length;
        pdfCount += pdfs.length;
        imageCount += images.length;
      }
    }

    return { text: textCount, pdfs: pdfCount, images: imageCount };
  },
});

// Get all content for exam channels (for detail table view)
export const getExamContent = query({
  args: {
    channels: v.array(v.string()),
    dateFilter: v.optional(v.string()),
    channelFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    let cutoff: string | null = null;

    if (args.dateFilter === "today") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      cutoff = d.toISOString().split("T")[0];
    } else if (args.dateFilter === "week") {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      cutoff = d.toISOString().split("T")[0];
    } else if (args.dateFilter === "month") {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      cutoff = d.toISOString().split("T")[0];
    }

    const rawChannels =
      args.channelFilter && args.channelFilter !== "all"
        ? [args.channelFilter]
        : args.channels;
    const channels = rawChannels.map(cleanChannel);

    const allTexts = [];
    const allPdfs = [];
    const allImages = [];

    for (const channel of channels) {
      const texts = await ctx.db
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

      for (const t of texts) {
        if (!cutoff || t.date >= cutoff) {
          allTexts.push({ ...t, channel });
        }
      }
      for (const p of pdfs) {
        if (!cutoff || (p.date && p.date >= cutoff)) {
          allPdfs.push({ ...p, channel });
        }
      }
      for (const i of images) {
        if (!cutoff || (i.date && i.date >= cutoff)) {
          allImages.push({ ...i, channel });
        }
      }
    }

    return { texts: allTexts, pdfs: allPdfs, images: allImages };
  },
});
