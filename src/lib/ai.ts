import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// ─── Provider Setup ──────────────────────────────────────────────────────────

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use gpt-4o-mini as the primary model — fast, cheap, reliable
const PRIMARY_MODEL = openai("gpt-4o-mini");
const FALLBACK_MODEL = openai("gpt-4o-mini");

/** Timeout for the primary attempt before falling back (ms). */
const GROQ_TIMEOUT_MS = 15_000;

type Provider = "groq" | "openai";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PromptOptions {
  system: string;
  prompt: string;
  messages?: never;
}

interface MessagesOptions {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  prompt?: never;
}

type LLMCallOptions = PromptOptions | MessagesOptions;

interface GenerateResult {
  text: string;
  provider: Provider;
}

// ─── Non-Streaming: generateTextWithFallback ─────────────────────────────────

/**
 * Attempts a non-streaming LLM call against Groq first (with a 10s timeout).
 * On any failure (429, 5xx, timeout, network error), retries exactly once
 * against OpenAI gpt-4o-mini. Transparent to the caller.
 */
export async function generateTextWithFallback(
  options: LLMCallOptions
): Promise<GenerateResult> {
  const callOptions = buildCallOptions(options);

  // --- Groq attempt ---
  try {
    const result = await withTimeout(
      generateText({ model: PRIMARY_MODEL, ...callOptions }),
      GROQ_TIMEOUT_MS
    );

    logProvider("groq", "generate");
    return { text: result.text, provider: "groq" };
  } catch (err) {
    logFallback(err);
  }

  // --- OpenAI fallback (single attempt, no further retry) ---
  const result = await generateText({ model: FALLBACK_MODEL, ...callOptions });

  logProvider("openai", "generate");
  return { text: result.text, provider: "openai" };
}

// ─── Streaming: streamTextWithFallback ───────────────────────────────────────

interface StreamCallOptions extends PromptOptions {
  onFinish?: (event: { text: string }) => void | Promise<void>;
  maxTokens?: number;
}

interface StreamCallMessagesOptions extends MessagesOptions {
  onFinish?: (event: { text: string }) => void | Promise<void>;
  maxTokens?: number;
}

type StreamOptions = StreamCallOptions | StreamCallMessagesOptions;

/**
 * Attempts a streaming LLM call against Groq first (with a 10s timeout on
 * the initial connection / first chunk). On failure, falls back to OpenAI.
 *
 * Returns the streamText result object — call `.toTextStreamResponse()` on it.
 */
export async function streamTextWithFallback(
  options: StreamOptions
): Promise<{ stream: ReturnType<typeof streamText>; provider: Provider }> {
  const callOptions = buildCallOptions(options);

  // --- Groq attempt ---
  try {
    const probeStream = streamText({
      model: PRIMARY_MODEL,
      ...callOptions,
      onFinish: options.onFinish,
      abortSignal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });

    // Verify the stream actually starts producing data
    await withTimeout(
      probeStream.textStream[Symbol.asyncIterator]().next(),
      GROQ_TIMEOUT_MS
    );

    // Stream started successfully — re-create without the tight abort signal
    const actualStream = streamText({
      model: PRIMARY_MODEL,
      ...callOptions,
      onFinish: options.onFinish,
    });

    logProvider("groq", "stream");
    return { stream: actualStream, provider: "groq" };
  } catch (err) {
    logFallback(err);
  }

  // --- OpenAI fallback ---
  const stream = streamText({
    model: FALLBACK_MODEL,
    ...callOptions,
    onFinish: options.onFinish,
  });

  logProvider("openai", "stream");
  return { stream, provider: "openai" };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCallOptions(options: LLMCallOptions | StreamOptions) {
  const base: Record<string, unknown> = { system: options.system };

  if ("maxTokens" in options && options.maxTokens) {
    base.maxTokens = options.maxTokens;
  }

  if ("messages" in options && options.messages) {
    return { ...base, messages: options.messages } as const;
  }
  return { ...base, prompt: (options as PromptOptions).prompt } as const;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`LLM call timed out after ${ms}ms`)),
      ms
    );

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function logProvider(provider: Provider, mode: "generate" | "stream") {
  console.log(`[ai] ${mode} served by: ${provider}`);
}

function logFallback(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[ai] Groq failed, falling back to OpenAI. Reason: ${message}`);
}
