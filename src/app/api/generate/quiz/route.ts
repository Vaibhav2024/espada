import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import { quizQuestions, assetChunks, spaceResources, knowledgeItems } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { resolveFolder } from "@/lib/resolve-folder";
import { eq, inArray } from "drizzle-orm";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GeneratedQuestion {
  type: "multiple-choice" | "short-answer" | "true-false" | "fill-in-blank";
  question: string;
  options?: string[];
  correctOptions?: number[];
  exampleAnswer?: string;
  answer?: string;
}

/**
 * POST /api/generate/quiz — Generate quiz questions from space/folder resources.
 * Body: { spaceId, folderId?, count?, types?, language?, hardMode?, topics? }
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  const quotaResult = await consumeQuota(userId, "ai_msgs", plan);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      { error: "Daily AI limit reached", limit: quotaResult.limit },
      { status: 429 }
    );
  }

  const { spaceId, folderId, count = 10, types, language, hardMode, topics, assetIds } = await req.json();
  if (!spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  // Cap at 30 questions
  const questionCount = Math.min(Number(count) || 10, 30);

  let context = "";

  // Priority 1: Use explicit asset IDs if provided
  if (assetIds && assetIds.length > 0) {
    context = await getAssetContext(assetIds);
  }

  // Priority 2: Try space resources
  if (!context) {
    context = await getSpaceContext(spaceId);
  }

  // Priority 3: Fallback to folder knowledge (only if no explicit assetIds)
  if (!context && folderId && (!assetIds || assetIds.length === 0)) {
    const realFolderId = await resolveFolder(folderId, userId);
    if (realFolderId) {
      context = await getFolderContext(realFolderId);
    }
  }

  if (!context) {
    return NextResponse.json(
      { error: "No content available to generate quiz from" },
      { status: 400 }
    );
  }

  // Build type instructions
  const typeMap: Record<string, string> = {
    "Multiple choice": "multiple-choice",
    "True or false": "true-false",
    "Short response": "short-answer",
    "Fill in the blank": "fill-in-blank",
  };
  const mappedTypes = types
    ? types.map((t: string) => typeMap[t] || t.toLowerCase().replace(/ /g, "-"))
    : undefined;
  const typeInstructions = mappedTypes
    ? `Use only these question types: ${mappedTypes.join(", ")}`
    : `Mix question types: multiple-choice, short-answer, true-false, fill-in-blank`;

  const languageInstruction = language && language !== "English"
    ? `Write all questions and answers in ${language}.`
    : "";

  const difficultyInstruction = hardMode
    ? "Make the questions challenging and require deep understanding — avoid surface-level recall questions."
    : "Make the questions moderate difficulty — suitable for studying and review.";

  const topicInstruction = topics
    ? `Focus specifically on these topics: ${topics}`
    : "";

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You generate quiz questions for students. Output ONLY a valid JSON array. No markdown, no explanation, no code fences.`,
    prompt: `Generate exactly ${questionCount} quiz questions from this material.
${typeInstructions}
${difficultyInstruction}
${languageInstruction}
${topicInstruction}

Material:
${context}

Output format (JSON array):
[{
  "type": "multiple-choice" | "short-answer" | "true-false" | "fill-in-blank",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctOptions": [0],
  "exampleAnswer": "A conceptual explanation (2-3 sentences) explaining WHY this answer is correct, referencing the underlying concept from the material.",
  "answer": "true" | "false" | "word"
}]

Rules:
- For multiple-choice: include "options" (4 choices), "correctOptions" (array of correct indices), and "exampleAnswer" (conceptual explanation WHY the correct option is right)
- For true-false: include "answer" as "true" or "false", and "exampleAnswer" must explain the CONCEPT behind why the statement is true or false — NOT just repeat "true" or "false"
- For short-answer: include "answer" with the expected answer, and "exampleAnswer" explaining the concept in detail
- For fill-in-blank: include "answer" with the correct word/phrase, and "exampleAnswer" explaining WHY this word fits and what concept it relates to
- CRITICAL: "exampleAnswer" must NEVER be just "true", "false", or the answer word itself. It must be a 2-3 sentence conceptual explanation.
- Generate exactly ${questionCount} questions, no more, no less`,
  });

  let questions: GeneratedQuestion[];
  try {
    questions = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      questions = JSON.parse(match[0]);
    } else {
      return NextResponse.json(
        { error: "Failed to parse generated quiz" },
        { status: 500 }
      );
    }
  }

  // Ensure we don't exceed the requested count
  questions = questions.slice(0, questionCount);

  // Fix true/false questions: set correctOptions from answer field
  questions = questions.map((q) => {
    if (q.type === "true-false") {
      const answerLower = (q.answer || "").toLowerCase().trim();
      q.correctOptions = answerLower === "true" ? [0] : [1];
    }
    return q;
  });

  const inserted = await db
    .insert(quizQuestions)
    .values(
      questions.map((q, index) => ({
        spaceId,
        type: q.type,
        question: q.question,
        options: q.options ?? null,
        correctOptions: q.correctOptions ?? null,
        exampleAnswer: q.exampleAnswer ?? null,
        answer: q.answer ?? null,
        orderIndex: index,
      }))
    )
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}

async function getAssetContext(assetIds: string[]): Promise<string> {
  if (assetIds.length === 0) return "";

  const chunks = await db
    .select({ content: assetChunks.content })
    .from(assetChunks)
    .where(inArray(assetChunks.assetId, assetIds))
    .limit(20);

  return chunks.map((c) => c.content).join("\n\n");
}

async function getSpaceContext(spaceId: string): Promise<string> {
  const resources = await db
    .select({ assetId: spaceResources.assetId })
    .from(spaceResources)
    .where(eq(spaceResources.spaceId, spaceId));

  const assetIds = resources.map((r) => r.assetId);
  if (assetIds.length === 0) return "";

  const chunks = await db
    .select({ content: assetChunks.content })
    .from(assetChunks)
    .where(inArray(assetChunks.assetId, assetIds))
    .limit(15);

  return chunks.map((c) => c.content).join("\n\n");
}

async function getFolderContext(folderId: string): Promise<string> {
  const items = await db
    .select({ assetId: knowledgeItems.assetId })
    .from(knowledgeItems)
    .where(eq(knowledgeItems.folderId, folderId));

  const assetIds = items.map((i) => i.assetId);
  if (assetIds.length === 0) return "";

  const chunks = await db
    .select({ content: assetChunks.content })
    .from(assetChunks)
    .where(inArray(assetChunks.assetId, assetIds))
    .limit(20);

  return chunks.map((c) => c.content).join("\n\n");
}
