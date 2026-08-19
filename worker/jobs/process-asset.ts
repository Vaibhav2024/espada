import { db } from "../../src/db";
import { assets, assetChunks } from "../../src/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

interface ProcessAssetData {
  assetId: string;
}

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Process an asset: read file or fetch URL, extract text, chunk it,
 * compute embeddings via OpenAI text-embedding-3-small, and store in
 * asset_chunks with ownerId for user-level isolation.
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
      textContent = await extractFileText(asset.storageKey, asset.mimeType || "", asset.name);
    } else if ((asset.type === "link" || asset.type === "web" || asset.type === "youtube") && asset.url) {
      textContent = await extractUrlContent(asset.url);
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
          ownerId: asset.uploaderId,
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

// ─── File Text Extraction ────────────────────────────────────────────────────

async function extractFileText(storageKey: string, mimeType: string, fileName: string): Promise<string> {
  const filePath = join(UPLOADS_DIR, storageKey);
  const buffer = await readFile(filePath);
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    const pdfData = await pdf(buffer);
    console.log(`[process-asset] PDF extracted: ${pdfData.text.length} chars from ${fileName}`);
    return pdfData.text;
  }

  // DOCX (Word)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[process-asset] DOCX extracted: ${result.value.length} chars from ${fileName}`);
    return result.value;
  }

  // Plain text, Markdown
  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    ext === "txt" ||
    ext === "md"
  ) {
    return buffer.toString("utf-8");
  }

  // PPTX — extract text from XML slides
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  ) {
    return extractPptxText(buffer);
  }

  // Fallback: try as UTF-8 text
  console.warn(`[process-asset] Unknown type "${mimeType}" (${ext}), attempting UTF-8 extraction for ${fileName}`);
  return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
}

/**
 * Extract text from PPTX files by reading the XML slide content.
 * PPTX is a ZIP file containing XML slides at ppt/slides/slide*.xml.
 */
async function extractPptxText(buffer: Buffer): Promise<string> {
  // Use dynamic import for JSZip (or built-in unzip)
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    const slideTexts: string[] = [];
    const slideFiles = Object.keys(zip.files)
      .filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort();

    for (const slideFile of slideFiles) {
      const content = await zip.files[slideFile].async("string");
      // Extract text from XML tags like <a:t>text</a:t>
      const texts = content.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
      if (texts) {
        const slideText = texts
          .map((t) => t.replace(/<[^>]+>/g, ""))
          .join(" ");
        slideTexts.push(slideText);
      }
    }

    return slideTexts.join("\n\n");
  } catch (err) {
    console.warn("[process-asset] PPTX extraction failed, trying as raw text:", err);
    return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
  }
}

// ─── URL Content Extraction ──────────────────────────────────────────────────

async function extractUrlContent(url: string): Promise<string> {
  // Check if it's a YouTube URL
  if (isYouTubeUrl(url)) {
    return extractYouTubeContent(url);
  }

  // Web page scraping via Jina.ai Reader API
  return extractWebContent(url);
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed)/.test(url);
}

/**
 * Extract YouTube video transcript using youtube-transcript library.
 * Falls back to basic video info if transcript is unavailable.
 */
async function extractYouTubeContent(url: string): Promise<string> {
  try {
    const { YoutubeTranscript } = await import("youtube-transcript");

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error("Could not extract video ID from URL");
    }

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (transcriptItems && transcriptItems.length > 0) {
      const formattedTranscript = transcriptItems
        .map((item) => {
          const minutes = Math.floor(item.offset / 60000);
          const seconds = Math.floor((item.offset % 60000) / 1000);
          const timestamp = `[${minutes}:${seconds.toString().padStart(2, "0")}]`;
          return `${timestamp} ${item.text}`;
        })
        .join("\n");

      console.log(`[process-asset] YouTube transcript extracted: ${formattedTranscript.length} chars`);
      return `YouTube Video Transcript\n\n${formattedTranscript}`;
    }

    throw new Error("Empty transcript");
  } catch (err) {
    console.warn(`[process-asset] YouTube transcript failed for ${url}:`, err);
    // Fallback: try Jina.ai for the YouTube page content
    return extractWebContent(url);
  }
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract web page content using Jina.ai Reader API.
 * Converts web pages to clean markdown text.
 */
async function extractWebContent(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        Accept: "text/markdown",
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`Jina.ai returned ${response.status}: ${response.statusText}`);
    }

    const markdown = await response.text();
    console.log(`[process-asset] Web content extracted: ${markdown.length} chars from ${url}`);

    if (markdown.trim().length < 20) {
      throw new Error("Jina returned very little content");
    }

    return markdown;
  } catch (err) {
    console.warn(`[process-asset] Jina.ai extraction failed for ${url}:`, err);

    // Simple fallback: basic fetch and strip HTML tags
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EspadaBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();
      // Strip HTML tags, scripts, styles
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      console.log(`[process-asset] Fallback HTML extraction: ${text.length} chars from ${url}`);
      return text;
    } catch {
      return `Content from: ${url} (extraction failed)`;
    }
  }
}

// ─── Text Chunking ───────────────────────────────────────────────────────────

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

// ─── Embeddings ──────────────────────────────────────────────────────────────

/**
 * Compute embeddings using OpenAI text-embedding-3-small.
 * 1536 dimensions, $0.02 per 1M tokens.
 */
async function computeEmbeddings(chunks: string[]): Promise<(number[] | null)[]> {
  if (chunks.length === 0) return [];

  const BATCH_SIZE = 100;
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

      const data = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      const sorted = data.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map((d) => d.embedding));
    } catch (error) {
      console.error("[embeddings] OpenAI API call failed:", error);
      allEmbeddings.push(...batch.map(() => null));
    }
  }

  return allEmbeddings;
}
