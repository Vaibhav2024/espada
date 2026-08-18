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
    system: `You clean up and polish raw transcription text into well-structured notes. Fix grammar, remove filler words, organize into clear paragraphs with headings where appropriate. Preserve all factual content — do not add information that wasn't in the original.`,
    prompt: `Polish these raw transcription notes into clean, well-organized study notes:\n\n${rawText}`,
  });

  return stream.toTextStreamResponse();
}
