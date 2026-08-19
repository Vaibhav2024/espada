import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import { solveProblems } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { eq } from "drizzle-orm";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/generate/solve — Solve a problem step by step.
 * Body: { spaceId: string, question: string, title?: string }
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

  const { spaceId, question, title } = await req.json();
  if (!spaceId || !question) {
    return NextResponse.json(
      { error: "spaceId and question are required" },
      { status: 400 }
    );
  }

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You solve academic problems step by step. Output ONLY a valid JSON object. No markdown, no code fences.`,
    prompt: `Solve this problem step by step:

${question}

Output format:
{"answer": "the final answer (concise)", "steps": ["Step 1: detailed explanation...", "Step 2: detailed explanation...", ...]}

Rules:
- Provide 3-6 clear, detailed steps explaining the reasoning
- Each step should be 1-3 sentences
- The final answer should be concise (1 sentence or a number)
- If the problem is conceptual, explain the concept in steps`,
  });

  let result: { answer: string; steps: string[] };
  try {
    result = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      result = JSON.parse(match[0]);
    } else {
      return NextResponse.json(
        { error: "Failed to parse solution" },
        { status: 500 }
      );
    }
  }

  // Get current count for ordering
  const existing = await db
    .select()
    .from(solveProblems)
    .where(eq(solveProblems.spaceId, spaceId));

  const [problem] = await db
    .insert(solveProblems)
    .values({
      spaceId,
      title: title ?? question.slice(0, 80),
      question,
      answer: result.answer,
      steps: result.steps,
      orderIndex: existing.length,
    })
    .returning();

  return NextResponse.json(problem, { status: 201 });
}
