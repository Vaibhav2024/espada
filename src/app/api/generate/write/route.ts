import { NextRequest } from "next/server";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { streamTextWithFallback } from "@/lib/ai";

/**
 * POST /api/generate/write — AI writing assistance (generate/continue/improve).
 * Body: { spaceId: string, prompt: string, mode: "generate" | "continue" | "improve", existingContent?: string }
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  const quotaResult = await consumeQuota(userId, "ai_msgs", plan);
  if (!quotaResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Daily AI limit reached", limit: quotaResult.limit }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { spaceId, prompt, mode, existingContent } = await req.json();
  if (!spaceId || !prompt) {
    return new Response(
      JSON.stringify({ error: "spaceId and prompt are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let systemPrompt: string;
  let userPrompt: string;

  switch (mode) {
    case "continue":
      systemPrompt = `You continue writing seamlessly from where the student left off. Match their style, tone, and level of detail.`;
      userPrompt = `Continue this text naturally:\n\n${existingContent}\n\nTopic/direction: ${prompt}`;
      break;
    case "improve":
      systemPrompt = `You improve academic writing. Make it clearer, more concise, and better structured while preserving the student's voice and ideas.`;
      userPrompt = `Improve this text:\n\n${existingContent}\n\nFocus on: ${prompt}`;
      break;
    default: // "generate"
      systemPrompt = `You write academic content for students. Write clearly, accurately, and at an appropriate academic level.`;
      userPrompt = prompt;
  }

  const { stream } = await streamTextWithFallback({
    system: systemPrompt,
    prompt: userPrompt,
  });

  return stream.toTextStreamResponse();
}
