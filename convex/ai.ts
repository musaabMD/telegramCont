"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const MODEL = "google/gemini-2.0-flash-001";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY environment variable is not set");
  return key;
}

// Convert null to undefined (Convex validators don't accept null)
function str(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}
function strArr(val: unknown): string[] | undefined {
  return Array.isArray(val) ? val.map(String) : undefined;
}
function num(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined;
}

const SYSTEM_PROMPT = `You are a medical exam content processor. Given raw scraped text from a Telegram channel that contains medical exam questions (like SMLE, SDLE, etc.), extract and structure the content.

Return a JSON object with these fields:
- q_text: The cleaned question text only
- choices: An array of answer choices (e.g. ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"])
- correct_choice_index: The 0-based index of the correct answer (number)
- explanation: A clear explanation of why the correct answer is right
- hy_summary: A brief high-yield summary for quick review (1-2 sentences)
- subject: The medical subject (e.g. "Obstetrics", "Surgery", "Internal Medicine")
- topic: The specific topic (e.g. "Preeclampsia", "Appendicitis")
- exam_name: The exam name if mentioned (e.g. "SMLE") or null

If the text is not a medical question, return: {"q_text": null}

IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`;

// Main action: process a single text message with OpenRouter
export const processWithAI = action({
  args: { id: v.id("text_messages") },
  handler: async (ctx, args): Promise<{ success: boolean; isQuestion?: boolean; cost?: number; error?: string }> => {
    // 1. Mark as in_progress
    await ctx.runMutation(internal.aiHelpers.saveAiResult, {
      id: args.id,
      ai_status: "in_progress",
    });

    // 2. Get the message text
    const msg = await ctx.runQuery(internal.aiHelpers.getTextMessage, { id: args.id });
    if (!msg) throw new Error("Message not found");

    // 3. Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: msg.text },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      await ctx.runMutation(internal.aiHelpers.saveAiResult, {
        id: args.id,
        ai_status: "todo",
      });
      throw new Error(`OpenRouter error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const rawContent = choice?.message?.content ?? "";
    const usage = data.usage ?? {};

    // 4. Extract cost directly from OpenRouter's usage response
    const totalCost = usage.cost ?? 0;
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? 0;

    // 5. Parse AI response
    let parsed: Record<string, unknown>;
    try {
      // Strip markdown fences if present
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Couldn't parse – mark done with no AI fields
      await ctx.runMutation(internal.aiHelpers.saveAiResult, {
        id: args.id,
        ai_status: "done",
        ai_cost: totalCost,
        ai_prompt_tokens: promptTokens,
        ai_completion_tokens: completionTokens,
        ai_total_tokens: totalTokens,
      });
      return { success: false, error: "Failed to parse AI response" };
    }

    // 6. Save structured result
    if (parsed.q_text === null || parsed.q_text === undefined) {
      // Not a medical question
      await ctx.runMutation(internal.aiHelpers.saveAiResult, {
        id: args.id,
        ai_status: "done",
        ai_cost: totalCost,
        ai_prompt_tokens: promptTokens,
        ai_completion_tokens: completionTokens,
        ai_total_tokens: totalTokens,
      });
      return { success: true, isQuestion: false };
    }

    await ctx.runMutation(internal.aiHelpers.saveAiResult, {
      id: args.id,
      q_text: str(parsed.q_text),
      choices: strArr(parsed.choices),
      correct_choice_index: num(parsed.correct_choice_index),
      explanation: str(parsed.explanation),
      hy_summary: str(parsed.hy_summary),
      subject: str(parsed.subject),
      topic: str(parsed.topic),
      exam_name: str(parsed.exam_name),
      ai_cost: totalCost,
      ai_prompt_tokens: promptTokens,
      ai_completion_tokens: completionTokens,
      ai_total_tokens: totalTokens,
      ai_status: "done",
    });

    return { success: true, isQuestion: true, cost: totalCost };
  },
});

// Action: process a single text message with a custom prompt (from exam settings)
export const processWithCustomPrompt = action({
  args: { id: v.id("text_messages"), customPrompt: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; isQuestion?: boolean; cost?: number; error?: string }> => {
    // 1. Mark as in_progress
    await ctx.runMutation(internal.aiHelpers.saveAiResult, {
      id: args.id,
      ai_status: "in_progress",
    });

    // 2. Get the message text
    const msg = await ctx.runQuery(internal.aiHelpers.getTextMessage, { id: args.id });
    if (!msg) throw new Error("Message not found");

    // 3. Build system prompt: user's custom instructions + JSON format requirement
    const fullPrompt = `${args.customPrompt}

You MUST return a JSON object with these fields:
- q_text: The cleaned question text
- choices: An array of answer choices (e.g. ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"])
- correct_choice_index: The 0-based index of the correct answer (number)
- explanation: A clear explanation of why the correct answer is right
- hy_summary: A brief high-yield summary for quick review (1-2 sentences)
- subject: The medical subject (e.g. "Obstetrics", "Surgery", "Internal Medicine")
- topic: The specific topic (e.g. "Preeclampsia", "Appendicitis")
- exam_name: The exam name if mentioned (e.g. "SMLE") or null

If the text is not a medical question, return: {"q_text": null}

IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`;

    // 4. Call OpenRouter with custom prompt
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: fullPrompt },
          { role: "user", content: msg.text },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      await ctx.runMutation(internal.aiHelpers.saveAiResult, {
        id: args.id,
        ai_status: "todo",
      });
      throw new Error(`OpenRouter error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const rawContent = choice?.message?.content ?? "";
    const usage = data.usage ?? {};

    // 4. Extract cost directly from OpenRouter's usage response
    const totalCost = usage.cost ?? 0;
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? 0;

    // 5. Parse AI response
    let parsed: Record<string, unknown>;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      await ctx.runMutation(internal.aiHelpers.saveAiResult, {
        id: args.id,
        ai_status: "done",
        ai_cost: totalCost,
        ai_prompt_tokens: promptTokens,
        ai_completion_tokens: completionTokens,
        ai_total_tokens: totalTokens,
      });
      return { success: false, error: "Failed to parse AI response" };
    }

    // 6. Save structured result
    if (parsed.q_text === null || parsed.q_text === undefined) {
      await ctx.runMutation(internal.aiHelpers.saveAiResult, {
        id: args.id,
        ai_status: "done",
        ai_cost: totalCost,
        ai_prompt_tokens: promptTokens,
        ai_completion_tokens: completionTokens,
        ai_total_tokens: totalTokens,
      });
      return { success: true, isQuestion: false };
    }

    await ctx.runMutation(internal.aiHelpers.saveAiResult, {
      id: args.id,
      q_text: str(parsed.q_text),
      choices: strArr(parsed.choices),
      correct_choice_index: num(parsed.correct_choice_index),
      explanation: str(parsed.explanation),
      hy_summary: str(parsed.hy_summary),
      subject: str(parsed.subject),
      topic: str(parsed.topic),
      exam_name: str(parsed.exam_name),
      ai_cost: totalCost,
      ai_prompt_tokens: promptTokens,
      ai_completion_tokens: completionTokens,
      ai_total_tokens: totalTokens,
      ai_status: "done",
    });

    return { success: true, isQuestion: true, cost: totalCost };
  },
});

// Helper: parse messages from a Telegram public page HTML.
// Splits HTML at each data-post boundary so ID, text, and date stay aligned.
function parseMessagesFromHtml(html: string, ch: string) {
  const messages: { id: number; text: string; date: string; link: string }[] = [];

  // Find all data-post positions to split into per-message chunks
  const postPositions: { index: number; id: number }[] = [];
  const postRegex = /data-post="[^/]+\/(\d+)"/g;
  let m;
  while ((m = postRegex.exec(html)) !== null) {
    postPositions.push({ index: m.index, id: parseInt(m[1], 10) });
  }

  for (let i = 0; i < postPositions.length; i++) {
    const start = postPositions[i].index;
    const end = i + 1 < postPositions.length ? postPositions[i + 1].index : html.length;
    const block = html.slice(start, end);
    const msgId = postPositions[i].id;

    // Extract text (only messages that have tgme_widget_message_text)
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!textMatch) continue;
    const rawText = textMatch[1].replace(/<[^>]+>/g, "").trim();
    if (!rawText) continue;

    // Extract date
    const dateMatch = block.match(/<time[^>]*datetime="([^"]+)"[^>]*>/);
    const date = dateMatch?.[1] ?? new Date().toISOString();

    messages.push({
      id: msgId,
      text: rawText,
      date: date.slice(0, 19).replace("T", " "),
      link: `https://t.me/${ch}/${msgId}`,
    });
  }
  return messages;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Action: scrape a channel's public Telegram page and save messages that match rules
export const scrapeChannel = action({
  args: {
    channel: v.string(),
    inclusion_criteria: v.array(v.string()),
    exclusion_criteria: v.array(v.string()),
    dateFrom: v.optional(v.string()), // "YYYY-MM-DD"
    dateTo: v.optional(v.string()),   // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const ch = args.channel.replace(/^@/, "").replace(/https?:\/\/t\.me\/s?\/?/g, "").replace(/\/+$/, "").trim();
    const dateFrom = args.dateFrom ?? null; // e.g. "2026-01-01"
    const dateTo = args.dateTo ?? null;     // e.g. "2026-02-08"
    const maxPages = dateFrom ? 10 : 3;     // scrape multiple pages by default

    try {
      let allMessages: { id: number; text: string; date: string; link: string }[] = [];
      let beforeId: number | null = null;
      let reachedStart = false;

      for (let page = 0; page < maxPages; page++) {
        const url = beforeId
          ? `https://t.me/s/${ch}?before=${beforeId}`
          : `https://t.me/s/${ch}`;
        const res = await fetch(url, { headers: { "User-Agent": UA } });
        if (!res.ok) {
          if (page === 0) return { ok: false, error: `HTTP ${res.status}`, saved: 0, skipped: 0, total: 0 };
          break;
        }
        const html = await res.text();
        const pageMessages = parseMessagesFromHtml(html, ch);
        if (pageMessages.length === 0) break;

        allMessages.push(...pageMessages);

        // Check if we've gone past the date range start
        const oldestDate = pageMessages[0].date.slice(0, 10);
        if (dateFrom && oldestDate < dateFrom) {
          reachedStart = true;
          break;
        }

        // Set beforeId to the oldest message for next page
        beforeId = pageMessages[0].id;

        // Small delay between pages to be respectful
        if (page < maxPages - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        allMessages = allMessages.filter((m) => {
          const d = m.date.slice(0, 10);
          if (dateFrom && d < dateFrom) return false;
          if (dateTo && d > dateTo) return false;
          return true;
        });
      }

      // Apply inclusion/exclusion rules
      const inclusions = args.inclusion_criteria.map((k) => k.toLowerCase());
      const exclusions = args.exclusion_criteria.map((k) => k.toLowerCase());

      const filtered: typeof allMessages = [];
      let skipped = 0;

      for (const msg of allMessages) {
        const lower = msg.text.toLowerCase();
        if (exclusions.length > 0 && exclusions.some((kw) => lower.includes(kw))) {
          skipped++;
          continue;
        }
        if (inclusions.length > 0 && !inclusions.some((kw) => lower.includes(kw))) {
          skipped++;
          continue;
        }
        filtered.push(msg);
      }

      // Save matching messages to Convex
      if (filtered.length > 0) {
        await ctx.runMutation(internal.mutations.saveScrapedMessages, {
          channel: ch,
          messages: filtered.map((m) => ({
            message_id: m.id,
            date: m.date,
            text: m.text,
            link: m.link,
            is_forward: false,
            word_count: m.text.split(/\s+/).length,
            is_caption: false,
          })),
        });
      }

      // Update scrape log
      if (filtered.length > 0) {
        const lastDate = filtered[filtered.length - 1].date;
        await ctx.runMutation(internal.mutations.updateScrapeLogInternal, {
          channel: ch,
          last_message_date: lastDate,
          messages_scraped: filtered.length,
        });
      }

      return {
        ok: true,
        total: allMessages.length,
        saved: filtered.length,
        skipped,
      };
    } catch (err: unknown) {
      return { ok: false, error: String(err), saved: 0, skipped: 0, total: 0 };
    }
  },
});

// Action: scrape missing dates for all channels in an exam (Jan 2025 onward)
export const scrapeMissing = action({
  args: { examId: v.id("exams") },
  handler: async (ctx, args): Promise<{ ok: boolean; totalDaysFound?: number; totalMessagesFound?: number; error?: string }> => {
    const exam = await ctx.runQuery(internal.coverageHelpers.getExam, { id: args.examId });
    if (!exam) throw new Error("Exam not found");

    const channels = exam.channels.map((ch: string) =>
      ch.replace(/^@/, "").replace(/https?:\/\/t\.me\/s?\/?/g, "").replace(/\/+$/, "").trim()
    );

    const progressId = await ctx.runMutation(internal.mutations.createScrapeProgress, {
      exam_id: args.examId,
      total_channels: channels.length,
    });

    const TARGET_DATE = "2025-01-01";
    const MAX_PAGES_PER_CHANNEL = 50;
    const PAGE_DELAY_MS = 1500;
    const CHANNEL_DELAY_MS = 8000;

    let totalDaysFound = 0;
    let totalMessagesFound = 0;

    try {
      for (let chIdx = 0; chIdx < channels.length; chIdx++) {
        const ch = channels[chIdx];

        await ctx.runMutation(internal.mutations.updateScrapeProgress, {
          id: progressId,
          current_channel: ch,
          current_page: 0,
          log_entry: {
            timestamp: new Date().toISOString(),
            channel: ch,
            message: `Starting channel ${chIdx + 1}/${channels.length}: ${ch}`,
            level: "info",
          },
        });

        // First scrape latest page to catch recent messages
        let beforeId: number | null = null;
        let channelMessages = 0;
        const channelDays = new Set<string>();

        // Get oldest known message to know where to continue backwards from
        const oldestMsgId = await ctx.runQuery(
          internal.coverageHelpers.getOldestMessageId,
          { channel: ch }
        );

        // Phase 1: Scrape from latest (forward gap fill)
        // Phase 2: Continue backwards from oldest known message
        const phases: Array<{ label: string; startBeforeId: number | null; stopAtDate: string }> = [];

        // Always scrape latest first
        phases.push({ label: "recent", startBeforeId: null, stopAtDate: TARGET_DATE });

        // If we have existing messages, also paginate backwards from the oldest
        if (oldestMsgId !== null) {
          phases.push({ label: "backfill", startBeforeId: oldestMsgId, stopAtDate: TARGET_DATE });
        }

        for (const phase of phases) {
          beforeId = phase.startBeforeId;
          let reachedTarget = false;

          for (let page = 0; page < MAX_PAGES_PER_CHANNEL && !reachedTarget; page++) {
            const url = beforeId
              ? `https://t.me/s/${ch}?before=${beforeId}`
              : `https://t.me/s/${ch}`;

            await ctx.runMutation(internal.mutations.updateScrapeProgress, {
              id: progressId,
              current_page: page + 1,
            });

            try {
              const res = await fetch(url, { headers: { "User-Agent": UA } });

              if (res.status === 429) {
                await ctx.runMutation(internal.mutations.updateScrapeProgress, {
                  id: progressId,
                  log_entry: {
                    timestamp: new Date().toISOString(),
                    channel: ch,
                    message: "Rate limited! Waiting 30s...",
                    level: "warn",
                  },
                });
                await new Promise((r) => setTimeout(r, 30000));
                continue;
              }

              if (!res.ok) {
                await ctx.runMutation(internal.mutations.updateScrapeProgress, {
                  id: progressId,
                  log_entry: {
                    timestamp: new Date().toISOString(),
                    channel: ch,
                    message: `HTTP ${res.status} on page ${page + 1}. Stopping.`,
                    level: "error",
                  },
                });
                break;
              }

              const html = await res.text();
              const pageMessages = parseMessagesFromHtml(html, ch);

              if (pageMessages.length === 0) {
                await ctx.runMutation(internal.mutations.updateScrapeProgress, {
                  id: progressId,
                  log_entry: {
                    timestamp: new Date().toISOString(),
                    channel: ch,
                    message: `No messages on page ${page + 1}. Reached beginning.`,
                    level: "info",
                  },
                });
                break;
              }

              // Apply inclusion/exclusion criteria
              const inclusions = exam.inclusion_criteria.map((k: string) => k.toLowerCase());
              const exclusions = exam.exclusion_criteria.map((k: string) => k.toLowerCase());
              const filtered = pageMessages.filter((msg) => {
                const lower = msg.text.toLowerCase();
                if (exclusions.length > 0 && exclusions.some((kw: string) => lower.includes(kw))) return false;
                if (inclusions.length > 0 && !inclusions.some((kw: string) => lower.includes(kw))) return false;
                return true;
              });

              // Save filtered messages
              if (filtered.length > 0) {
                await ctx.runMutation(internal.mutations.saveScrapedMessages, {
                  channel: ch,
                  messages: filtered.map((m) => ({
                    message_id: m.id,
                    date: m.date,
                    text: m.text,
                    link: m.link,
                    is_forward: false,
                    word_count: m.text.split(/\s+/).length,
                    is_caption: false,
                  })),
                });
              }

              // Record dates covered (from ALL page messages, not just filtered)
              const dateCounts: Record<string, number> = {};
              for (const msg of pageMessages) {
                const d = msg.date.slice(0, 10);
                dateCounts[d] = (dateCounts[d] || 0) + 1;
              }
              const days = Object.entries(dateCounts).map(([date, count]) => ({
                date,
                messages_found: count,
              }));
              await ctx.runMutation(internal.mutations.upsertScrapeDaysBatch, {
                channel: ch,
                days,
              });

              const newDays = Object.keys(dateCounts).filter((d) => !channelDays.has(d));
              for (const d of Object.keys(dateCounts)) channelDays.add(d);
              channelMessages += filtered.length;
              totalMessagesFound += filtered.length;
              totalDaysFound += newDays.length;

              const oldestDate = pageMessages[0].date.slice(0, 10);
              const newestDate = pageMessages[pageMessages.length - 1].date.slice(0, 10);
              await ctx.runMutation(internal.mutations.updateScrapeProgress, {
                id: progressId,
                total_days_found: totalDaysFound,
                total_messages_found: totalMessagesFound,
                log_entry: {
                  timestamp: new Date().toISOString(),
                  channel: ch,
                  message: `Page ${page + 1}: ${pageMessages.length} msgs (${filtered.length} saved), ${oldestDate} → ${newestDate}`,
                  level: "info",
                },
              });

              if (oldestDate <= phase.stopAtDate) {
                reachedTarget = true;
                await ctx.runMutation(internal.mutations.updateScrapeProgress, {
                  id: progressId,
                  log_entry: {
                    timestamp: new Date().toISOString(),
                    channel: ch,
                    message: `Reached target date (${TARGET_DATE}). Phase complete!`,
                    level: "success",
                  },
                });
              }

              beforeId = pageMessages[0].id;

              if (!reachedTarget && page < MAX_PAGES_PER_CHANNEL - 1) {
                await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
              }
            } catch (fetchErr) {
              await ctx.runMutation(internal.mutations.updateScrapeProgress, {
                id: progressId,
                log_entry: {
                  timestamp: new Date().toISOString(),
                  channel: ch,
                  message: `Fetch error: ${String(fetchErr)}. Retrying in 15s...`,
                  level: "error",
                },
              });
              await new Promise((r) => setTimeout(r, 15000));
            }
          }
        }

        // Channel complete
        await ctx.runMutation(internal.mutations.updateScrapeProgress, {
          id: progressId,
          channels_completed: chIdx + 1,
          log_entry: {
            timestamp: new Date().toISOString(),
            channel: ch,
            message: `Done: ${channelDays.size} days, ${channelMessages} messages saved`,
            level: "success",
          },
        });

        if (channelMessages > 0) {
          await ctx.runMutation(internal.mutations.updateScrapeLogInternal, {
            channel: ch,
            last_message_date: new Date().toISOString().slice(0, 19).replace("T", " "),
            messages_scraped: channelMessages,
          });
        }

        if (chIdx < channels.length - 1) {
          await new Promise((r) => setTimeout(r, CHANNEL_DELAY_MS));
        }
      }

      await ctx.runMutation(internal.mutations.updateScrapeProgress, {
        id: progressId,
        status: "completed",
        finished_at: new Date().toISOString(),
        log_entry: {
          timestamp: new Date().toISOString(),
          channel: "all",
          message: `Complete! ${totalDaysFound} days, ${totalMessagesFound} messages across ${channels.length} channels`,
          level: "success",
        },
      });

      return { ok: true, totalDaysFound, totalMessagesFound };
    } catch (err) {
      await ctx.runMutation(internal.mutations.updateScrapeProgress, {
        id: progressId,
        status: "failed",
        finished_at: new Date().toISOString(),
        error: String(err),
        log_entry: {
          timestamp: new Date().toISOString(),
          channel: "system",
          message: `Fatal error: ${String(err)}`,
          level: "error",
        },
      });
      return { ok: false, error: String(err) };
    }
  },
});

// Action: test a channel by fetching its public feed
export const testChannel = action({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    const ch = args.channel.replace(/^@/, "").trim();
    try {
      const res = await fetch(`https://t.me/s/${ch}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      const html = await res.text();
      // Extract last message text from the public page
      const msgMatches = html.match(
        /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g
      );
      if (!msgMatches || msgMatches.length === 0) {
        return { ok: false, error: "No messages found — channel may be private or empty" };
      }
      const lastMsg = msgMatches[msgMatches.length - 1]
        .replace(/<[^>]+>/g, "")
        .trim()
        .slice(0, 200);
      return { ok: true, lastMessage: lastMsg, messageCount: msgMatches.length };
    } catch (err: unknown) {
      return { ok: false, error: String(err) };
    }
  },
});
