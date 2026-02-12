import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query to get a text message by ID
export const getTextMessage = internalQuery({
  args: { id: v.id("text_messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Internal mutation to save AI results
export const saveAiResult = internalMutation({
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
    ai_prompt_tokens: v.optional(v.float64()),
    ai_completion_tokens: v.optional(v.float64()),
    ai_total_tokens: v.optional(v.float64()),
    ai_status: v.string(),
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
