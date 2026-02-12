import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  exams: defineTable({
    name: v.string(),
    channels: v.array(v.string()),
    status: v.string(), // "active" | "inactive"
    inclusion_criteria: v.array(v.string()),
    exclusion_criteria: v.array(v.string()),
    ai_prompt: v.optional(v.string()), // custom AI system prompt for this exam
    schedule_frequency: v.optional(v.string()), // e.g. "every 6 hours"
  }).index("by_name", ["name"]),

  text_messages: defineTable({
    message_id: v.number(),
    channel: v.string(),
    date: v.string(),
    text: v.string(), // original scraped text
    views: v.optional(v.number()),
    link: v.string(),
    is_forward: v.boolean(),
    word_count: v.number(),
    is_caption: v.boolean(),
    ai_status: v.optional(v.string()), // "todo" | "in_progress" | "done"
    // AI-processed fields (populated by OpenRouter)
    q_text: v.optional(v.string()), // cleaned question text
    choices: v.optional(v.array(v.string())), // answer choices
    correct_choice_index: v.optional(v.float64()), // index of correct answer
    explanation: v.optional(v.string()), // AI explanation
    hy_summary: v.optional(v.string()), // high-yield summary
    subject: v.optional(v.string()), // e.g. "Obstetrics"
    topic: v.optional(v.string()), // e.g. "Preeclampsia"
    exam_name: v.optional(v.string()), // e.g. "SMLE"
    comment: v.optional(v.string()), // user notes: "appeared in exam", "repeated", etc.
    ai_cost: v.optional(v.float64()), // cost from OpenRouter usage.cost
    ai_prompt_tokens: v.optional(v.float64()),
    ai_completion_tokens: v.optional(v.float64()),
    ai_total_tokens: v.optional(v.float64()),
  })
    .index("by_channel", ["channel"])
    .index("by_channel_message", ["channel", "message_id"])
    .index("by_ai_status", ["ai_status"]),

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
    run_count: v.optional(v.float64()), // total number of scrape runs for this channel
  }).index("by_channel", ["channel"]),

  scrape_days: defineTable({
    channel: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    messages_found: v.float64(),
    scraped_at: v.string(), // ISO timestamp
  })
    .index("by_channel", ["channel"])
    .index("by_channel_date", ["channel", "date"]),

  scrape_progress: defineTable({
    exam_id: v.id("exams"),
    status: v.string(), // "running" | "completed" | "failed"
    started_at: v.string(),
    finished_at: v.optional(v.string()),
    current_channel: v.optional(v.string()),
    current_page: v.optional(v.float64()),
    total_channels: v.float64(),
    channels_completed: v.float64(),
    total_days_found: v.float64(),
    total_messages_found: v.float64(),
    log_entries: v.array(v.object({
      timestamp: v.string(),
      channel: v.string(),
      message: v.string(),
      level: v.string(), // "info" | "warn" | "error" | "success"
    })),
    error: v.optional(v.string()),
  }).index("by_exam", ["exam_id"]),

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
