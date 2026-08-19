import { NextRequest } from "next/server";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { streamTextWithFallback } from "@/lib/ai";

/**
 * POST /api/generate/write — AI writing assistance (generate/continue/improve).
 * Body: { spaceId, prompt, mode, existingContent?, tone?, length?, lengthUnit?, tense?, perspective? }
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

  const { spaceId, prompt, mode, existingContent, tone, length, lengthUnit, tense, perspective } = await req.json();
  if (!spaceId || !prompt) {
    return new Response(
      JSON.stringify({ error: "spaceId and prompt are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build style instructions from config fields
  const styleInstructions: string[] = [];
  if (tone) styleInstructions.push(`Use a ${tone.toLowerCase()} tone.`);
  if (length && lengthUnit) {
    styleInstructions.push(`The content should be approximately ${length} ${lengthUnit} long.`);
  }
  if (tense) styleInstructions.push(`Write in ${tense.toLowerCase()} tense.`);
  if (perspective) styleInstructions.push(`Write from a ${perspective.toLowerCase()} perspective.`);

  const styleBlock = styleInstructions.length > 0
    ? `\n\nStyle requirements:\n${styleInstructions.join("\n")}`
    : "";

  let systemPrompt: string;
  let userPrompt: string;

  switch (mode) {
    case "continue":
      systemPrompt = `You continue writing seamlessly from where the student left off. Match their style, tone, and level of detail.${styleBlock}`;
      userPrompt = `Continue this text naturally:\n\n${existingContent}\n\nTopic/direction: ${prompt}`;
      break;
    case "improve":
      systemPrompt = `You improve academic writing. Make it clearer, more concise, and better structured while preserving the student's voice and ideas.${styleBlock}`;
      userPrompt = `Improve this text:\n\n${existingContent}\n\nFocus on: ${prompt}`;
      break;
    default: // "generate"
      systemPrompt = `You write well-structured content for students. Write clearly, accurately, and at an appropriate academic level. Use markdown formatting to structure your output: # for main title, ## for sections, ### for subsections, - for bullet points, 1. for numbered lists, > for quotes. Use paragraphs for detailed explanations.${styleBlock}`;
      userPrompt = prompt;
  }

  const { stream } = await streamTextWithFallback({
    system: systemPrompt,
    prompt: userPrompt,
  });

  return stream.toTextStreamResponse();
}
