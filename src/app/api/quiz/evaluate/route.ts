import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { requireAuth } from "@/lib/auth";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/quiz/evaluate — Evaluate a user's short answer against the expected answer.
 * Body: { question: string, userAnswer: string, correctAnswer: string }
 * Returns: { correct: boolean, explanation: string }
 */
export async function POST(req: NextRequest) {
  await requireAuth();

  const { question, userAnswer, correctAnswer } = await req.json();

  if (!question || !userAnswer) {
    return NextResponse.json({ error: "question and userAnswer are required" }, { status: 400 });
  }

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You evaluate student quiz answers. Be LENIENT and fair. Accept abbreviations, short forms, synonyms, and alternate phrasings as correct. The student does NOT need to use the exact same wording. Output ONLY valid JSON with no markdown.`,
    prompt: `Question: "${question}"
Expected answer: "${correctAnswer || "Not provided"}"
Student's answer: "${userAnswer}"

IMPORTANT RULES FOR EVALUATION:
- "vector db" = "vector database" → CORRECT (abbreviation)
- "LLM" = "Large Language Model" → CORRECT (acronym)
- "ML" = "machine learning" → CORRECT (short form)
- "RAG" = "Retrieval-Augmented Generation" → CORRECT
- Any answer that refers to the SAME CONCEPT as the expected answer is CORRECT, even if phrased differently
- Only mark as incorrect if the student's answer refers to a DIFFERENT concept entirely

Evaluate the student's answer. Mark "correct": true if the answer refers to the same concept/thing as the expected answer, regardless of exact wording.

Output JSON:
{"score": 1-10, "correct": true/false, "explanation": "1-2 sentences on what the student got right or wrong", "improvement": "1-2 sentences on what they could add for a more complete answer (only if score < 9)"}

Score guidelines:
- 9-10: Correct concept, even if abbreviated or phrased differently
- 7-8: Correct concept but could be more precise
- 5-6: Partially correct, related concept but not quite right
- 3-4: Wrong concept but in the right domain
- 1-2: Completely wrong or irrelevant`,
  });

  try {
    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return NextResponse.json(JSON.parse(match[0]));
    }
    return NextResponse.json({
      correct: false,
      explanation: "Unable to evaluate. The expected answer is: " + (correctAnswer || "not available"),
    });
  }
}
