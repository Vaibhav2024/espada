import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { solveProblems } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { generateTextWithFallback } from "@/lib/ai";
import { eq } from "drizzle-orm";

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

  const { text } = await generateTextWithFallback({
    system: `You solve academic problems step by step. Output ONLY a JSON object with "answer" (final answer string) and "steps" (array of step strings). No markdown wrapping.`,
    prompt: `Solve this problem step by step:\n\n${question}\n\nOutput: {"answer": "...", "steps": ["Step 1: ...", "Step 2: ...", ...]}`,
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
