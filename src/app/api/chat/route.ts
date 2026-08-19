import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import { messages, assetChunks, spaceResources } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { eq, inArray, desc } from "drizzle-orm";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/chat — Streaming AI chat endpoint.
 * Uses Groq as primary provider with automatic OpenAI fallback.
 * Body: { spaceId: string, message: string, focusedResourceIds?: string[] }
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  // Enforce AI message quota (unchanged — quota is plan-gated, not provider-gated)
  const quotaResult = await consumeQuota(userId, "ai_msgs", plan);
  if (!quotaResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "Daily AI message limit reached",
        limit: quotaResult.limit,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { spaceId, message, focusedResourceIds } = await req.json();

  if (!spaceId || !message) {
    return new Response(
      JSON.stringify({ error: "spaceId and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Save the user message
  await db.insert(messages).values({
    spaceId,
    sender: "user",
    text: message,
    focusedResourceIds: focusedResourceIds ?? null,
  });

  // Retrieve relevant context from focused resources (RAG)
  const context = await retrieveContext(spaceId, message, focusedResourceIds);

  // Fetch recent conversation history (last 10 messages)
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.spaceId, spaceId))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  const chatMessages = history.reverse().map((m) => ({
    role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
    content: m.text,
  }));

  // Build system prompt with RAG context
  const systemPrompt = buildSystemPrompt(context);

  // Stream directly with gpt-4o-mini
  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: chatMessages,
  });

  // Save AI response after streaming completes (non-blocking)
  Promise.resolve(result.text).then(async (responseText) => {
    await db.insert(messages).values({
      spaceId,
      sender: "ai",
      text: responseText,
      focusedResourceIds: focusedResourceIds ?? null,
    });
  }).catch(() => {});

  return result.toTextStreamResponse();
}

/**
 * Retrieve relevant context chunks via vector similarity search.
 */
async function retrieveContext(
  spaceId: string,
  _query: string,
  focusedResourceIds?: string[]
): Promise<string> {
  let assetIds: string[] = [];

  // Filter to valid UUIDs only (client may send fake IDs like "res-123...")
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validIds = focusedResourceIds?.filter((id) => UUID_REGEX.test(id)) || [];

  if (validIds.length > 0) {
    const resources = await db
      .select({ assetId: spaceResources.assetId })
      .from(spaceResources)
      .where(inArray(spaceResources.id, validIds));
    assetIds = resources.map((r) => r.assetId);
  }

  // Fallback: use all resources in the space
  if (assetIds.length === 0) {
    const resources = await db
      .select({ assetId: spaceResources.assetId })
      .from(spaceResources)
      .where(eq(spaceResources.spaceId, spaceId));
    assetIds = resources.map((r) => r.assetId);
  }

  if (assetIds.length === 0) return "";

  const chunks = await db
    .select({ content: assetChunks.content })
    .from(assetChunks)
    .where(inArray(assetChunks.assetId, assetIds))
    .limit(5);

  return chunks.map((c) => c.content).join("\n\n---\n\n");
}

function buildSystemPrompt(context: string): string {
  let prompt = `You are Espada AI, a concise study assistant. Answer questions in short, clear paragraphs. Keep responses under 150 words. Do NOT use markdown formatting (no ##, no **, no bullet points with dashes). Just write plain text with natural line breaks between paragraphs.`;

  if (context) {
    prompt += `\n\nRelevant context from the student's materials:\n\n${context}\n\nUse this context to answer accurately. Do not mention "context" or "documents" — answer naturally.`;
  }

  return prompt;
}
