import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spaces, docLines } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { generateTextWithFallback } from "@/lib/ai";
import { eq, asc } from "drizzle-orm";

/**
 * POST /api/generate/recording — Process raw transcript text into structured notes.
 *
 * Called once when the user presses "Stop" during recording.
 * Takes the raw transcript accumulated since the last Stop and produces
 * clean, structured doc_lines (headings, bullets, key terms bolded).
 *
 * Body: { spaceId: string, rawTranscript: string, transcriptSegments: Array }
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  // Enforce AI message quota
  const quotaResult = await consumeQuota(userId, "ai_msgs", plan);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      { error: "Daily AI message limit reached", limit: quotaResult.limit },
      { status: 429 }
    );
  }

  const { spaceId, rawTranscript, transcriptSegments } = await req.json();

  if (!spaceId || !rawTranscript) {
    return NextResponse.json(
      { error: "spaceId and rawTranscript are required" },
      { status: 400 }
    );
  }

  // Generate structured notes from raw transcript
  const { text: structuredNotes } = await generateTextWithFallback({
    system: `You are a note-taking assistant. You receive raw speech-to-text transcript from a lecture or meeting recording. Your job is to transform it into clean, well-structured notes.

Output format rules:
- Use markdown-style formatting that maps to these line types: h1, h2, h3, bullet, quote, plain
- Start with an h2 heading summarizing the topic
- Use bullet points for key facts and details
- Bold (**term**) key terms and important concepts
- Use h3 for sub-sections if the content covers multiple topics
- Use quote format for notable quotes or critical statements
- Remove filler words, false starts, and repetitions
- Preserve ALL factual content — never add information not in the original
- Keep it concise but comprehensive

Output as JSON array of objects with { type, text } where type is one of: h1, h2, h3, bullet, number, quote, plain, table.
For table type, include tableData: { headers: string[], rows: string[][], style: "default" }.
Return ONLY the JSON array, no other text.`,
    prompt: `Transform this raw transcript into structured notes:\n\n${rawTranscript}`,
  });

  // Parse the LLM response into doc_lines format
  let parsedLines: Array<{ type: string; text: string; tableData?: unknown }>;
  try {
    // Try to parse as JSON array
    const cleaned = structuredNotes.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    parsedLines = JSON.parse(cleaned);
  } catch {
    // Fallback: treat as plain text lines
    parsedLines = structuredNotes
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => {
        if (line.startsWith("## ")) return { type: "h2", text: line.slice(3) };
        if (line.startsWith("### ")) return { type: "h3", text: line.slice(4) };
        if (line.startsWith("# ")) return { type: "h1", text: line.slice(2) };
        if (line.startsWith("- ") || line.startsWith("• "))
          return { type: "bullet", text: line.slice(2) };
        if (line.startsWith("> ")) return { type: "quote", text: line.slice(2) };
        return { type: "plain", text: line };
      });
  }

  // Get existing doc_lines count to append after them
  const existingLines = await db
    .select()
    .from(docLines)
    .where(eq(docLines.spaceId, spaceId))
    .orderBy(asc(docLines.orderIndex));

  const startIndex = existingLines.length;

  // Insert new lines after existing ones
  if (parsedLines.length > 0) {
    await db.insert(docLines).values(
      parsedLines.map((line, idx) => ({
        spaceId,
        orderIndex: startIndex + idx,
        type: line.type as "h1" | "h2" | "h3" | "bullet" | "number" | "quote" | "plain" | "table",
        text: line.text || "",
        tableData: line.tableData ?? null,
      }))
    );
  }

  // Save transcript segments to the space
  if (transcriptSegments) {
    // Merge with existing segments
    const [space] = await db
      .select({ transcriptSegments: spaces.transcriptSegments })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    const existingSegments = (space?.transcriptSegments as unknown[]) || [];
    const mergedSegments = [...existingSegments, ...transcriptSegments];

    await db
      .update(spaces)
      .set({ transcriptSegments: mergedSegments, updatedAt: new Date() })
      .where(eq(spaces.id, spaceId));
  }

  return NextResponse.json({
    lines: parsedLines,
    startIndex,
  });
}
