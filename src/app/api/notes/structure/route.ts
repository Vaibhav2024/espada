import { NextRequest } from "next/server";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { streamTextWithFallback } from "@/lib/ai";

/**
 * POST /api/notes/structure — Convert raw text into well-structured notes.
 * Used by the "Polish Notes" button in RecordingView.
 * Takes the full editor content and returns structured notes with headings, bullets, etc.
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
    system: `You are a note structuring assistant. Take the raw text provided and transform it into well-organized, structured study notes. Rules:
- Create clear headings (use # for main heading, ## for subheadings, ### for sub-subheadings)
- Use bullet points (- ) for key facts and details
- Bold important terms using **term**
- Use > for notable quotes or critical points
- Organize content logically by topic
- Keep all factual content from the original — do not remove information
- Do NOT add information that was not in the original text
- Make it scannable and easy to review`,
    prompt: `Structure these notes into organized study material:\n\n${rawText}`,
  });

  return stream.toTextStreamResponse();
}
