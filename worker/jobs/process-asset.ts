import { db } from "../../src/db";
import { assets, assetChunks } from "../../src/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
// pdf-parse v1 uses a default export function
import pdf from "pdf-parse/lib/pdf-parse.js";

interface ProcessAssetData {
  assetId: string;
}

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Process an asset: read file, extract text, chunk it, compute embeddings
 * via OpenAI text-embedding-3-small, and store in asset_chunks with ownerId
 * for user-level isolation.
 */
export async function processAsset(data: ProcessAssetData): Promise<void> {
  const { assetId } = data;

  // Mark as processing
  await db
    .update(assets)
    .set({ status: "processing" })
    .where(eq(assets.id, assetId));

  try {
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);

    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    let textContent: string;

    if (asset.type === "file" && asset.storageKey) {
      const filePath = join(UPLOADS_DIR, asset.storageKey);
      const buffer = await readFile(filePath);

      if (asset.mimeType === "application/pdf") {
        const pdfData = await pdf(buffer);
        textContent = pdfData.text;
        console.log(`[process-asset] PDF extracted: ${textContent.length} chars from ${asset.name}`);
      } else if (
        asset.mimeType === "text/plain" ||
        asset.mimeType === "text/markdown" ||
        asset.mimeType === "text/csv"
      ) {
        textContent = buffer.toString("utf-8");
      } else if (
        asset.mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        asset.mimeType === "application/msword"
      ) {
        textContent = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      } else {
        textContent = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      }
    } else if (asset.type === "link" && asset.url) {
      textContent = `Content from: ${asset.url}`;
    } else {
      throw new Error(`Cannot process asset type: ${asset.type}`);
    }

    if (!textContent.trim() || textContent.trim().length < 10) {
      console.warn(`[process-asset] No meaningful text extracted from ${asset.name}`);
      await db.update(assets).set({ status: "ready" }).where(eq(assets.id, assetId));
      return;
    }

    // Sanitize: remove null bytes (Postgres UTF-8 rejects \x00)
    textContent = textContent.replace(/\x00/g, "");

    // Chunk the text
    const chunks = chunkText(textContent, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`[process-asset] ${asset.name}: ${chunks.length} chunks`);

    // Compute embeddings via OpenAI text-embedding-3-small (1536-dim)
    const embeddings = await computeEmbeddings(chunks);

    // Store chunks with embeddings — ownerId ensures per-user vector isolation
    if (chunks.length > 0) {
      await db.insert(assetChunks).values(
        chunks.map((content, index) => ({
          assetId,
          ownerId: asset.uploaderId, // user isolation
          content,
          chunkIndex: index,
          embedding: embeddings[index] ?? null,
        }))
      );
    }

    await db.update(assets).set({ status: "ready" }).where(eq(assets.id, assetId));

    console.log(
      `[process-asset] ${asset.name} complete: ${chunks.length} chunks, ${embeddings.filter(Boolean).length} embeddings`
    );
  } catch (error) {
    console.error(`[process-asset] Failed for ${assetId}:`, error);
    await db.update(assets).set({ status: "failed" }).where(eq(assets.id, assetId));
    throw error;
  }
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

/**
 * Compute embeddings using OpenAI text-embedding-3-small.
 * 1536 dimensions, $0.02 per 1M tokens — very cheap.
 */
async function computeEmbeddings(chunks: string[]): Promise<(number[] | null)[]> {
  if (chunks.length === 0) return [];

  const BATCH_SIZE = 100; // OpenAI supports up to 2048 inputs per call
  const allEmbeddings: (number[] | null)[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: batch,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[embeddings] OpenAI returned ${response.status}: ${err}`);
        allEmbeddings.push(...batch.map(() => null));
        continue;
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      // Sort by index to maintain order
      const sorted = data.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map((d) => d.embedding));
    } catch (error) {
      console.error("[embeddings] OpenAI API call failed:", error);
      allEmbeddings.push(...batch.map(() => null));
    }
  }

  return allEmbeddings;
}
