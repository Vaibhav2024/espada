import { NextRequest } from "next/server";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { streamTextWithFallback } from "@/lib/ai";

/**
 * POST /api/notes/polish — Polish/clean up transcribed or raw notes.
 * Used by RecordingView to clean up Web Speech API transcription output.
 * Body: { spaceId: string, rawText: string }
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

  const { spaceId, rawText } = await req.json();
  if (!spaceId || !rawText) {
    return new Response(
      JSON.stringify({ error: "spaceId and rawText are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { stream } = await streamTextWithFallback({
    system: `You are a transcription fixer. You receive raw speech-to-text output which often contains misheard words, wrong homophones, and spelling errors from the speech recognition engine.

Your job:
- Analyze each sentence and figure out what the speaker ACTUALLY said based on context
- Fix misheard words (e.g. "He stands for" → "RAG stands for" if the context is about acronyms)
- Fix grammar and spelling mistakes
- Remove filler words (um, uh, like, you know)
- Make sentence phrasing natural and clean
- Do NOT add any new information, definitions, explanations, or elaboration
- Do NOT add headings, bullet points, or formatting
- Output ONLY the corrected version of what was spoken, nothing else
- Keep the same length and meaning — just fix errors`,
    prompt: rawText,
  });

  return stream.toTextStreamResponse();
}
