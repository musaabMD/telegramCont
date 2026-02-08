import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  exams: defineTable({
    name: v.string(),
    channels: v.array(v.string()),
    status: v.string(), // "active" | "inactive"
    inclusion_criteria: v.array(v.string()),
    exclusion_criteria: v.array(v.string()),
  }).index("by_name", ["name"]),

  text_messages: defineTable({
    message_id: v.number(),
    channel: v.string(),
    date: v.string(),
    text: v.string(),
    views: v.optional(v.number()),
    link: v.string(),
    is_forward: v.boolean(),
    word_count: v.number(),
    is_caption: v.boolean(),
    ai_status: v.optional(v.string()), // "todo" | "in_progress" | "done"
  })
    .index("by_channel", ["channel"])
    .index("by_channel_message", ["channel", "message_id"]),

  summary: defineTable({
    channel: v.string(),
    content: v.string(),
  }).index("by_channel", ["channel"]),

  pdfs_metadata: defineTable({
    message_id: v.number(),
    channel: v.string(),
    filename: v.string(),
    original_name: v.optional(v.string()),
    file_size: v.optional(v.number()),
    date: v.optional(v.string()),
    link: v.optional(v.string()),
    ai_status: v.optional(v.string()), // "todo" | "in_progress" | "done"
  }).index("by_channel", ["channel"]),

  images_metadata: defineTable({
    message_id: v.number(),
    channel: v.string(),
    filename: v.string(),
    caption: v.optional(v.string()),
    file_size: v.optional(v.number()),
    date: v.optional(v.string()),
    link: v.optional(v.string()),
    ai_status: v.optional(v.string()), // "todo" | "in_progress" | "done"
  }).index("by_channel", ["channel"]),

  scrape_log: defineTable({
    channel: v.string(),
    last_scrape_date: v.string(), // ISO format with seconds: "2026-02-07T14:30:25"
    last_message_date: v.string(), // date of newest message scraped: "2026-02-07 14:30:25"
    messages_scraped: v.number(),
  }).index("by_channel", ["channel"]),

  channel_health: defineTable({
    channel: v.string(),
    status: v.string(), // "ok" | "error"
    last_check: v.string(), // ISO timestamp
    message_count: v.optional(v.number()), // total messages in channel
    latest_messages: v.optional(v.array(v.object({
      id: v.number(),
      date: v.string(),
      text: v.string(),
    }))), // last 10 messages preview
    error: v.optional(v.string()),
  }).index("by_channel", ["channel"]),
});
