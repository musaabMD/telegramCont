import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
  }).index("by_channel", ["channel"]),

  images_metadata: defineTable({
    message_id: v.number(),
    channel: v.string(),
    filename: v.string(),
    caption: v.optional(v.string()),
    file_size: v.optional(v.number()),
    date: v.optional(v.string()),
    link: v.optional(v.string()),
  }).index("by_channel", ["channel"]),
});
