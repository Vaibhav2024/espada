/**
 * Typed client-side API wrappers for all Espada backend endpoints.
 * All functions run in the browser — they call Next.js Route Handlers via fetch.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FolderData {
  id: string;
  name: string;
  themeName: string;
  themeColor: string;
  iconName: string;
  isPublic: boolean;
  joinPreference: "link" | "web";
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceData {
  id: string;
  name: string;
  folderId: string;
  type:
    | "study-guide"
    | "quiz"
    | "flashcards"
    | "solve"
    | "write"
    | "recording"
    | "notes"
    | "chat"
    | "default";
  category: "shared" | "private";
  visibility: "me" | "members" | "public";
  isConfigured: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetData {
  id: string;
  uploaderId: string;
  type: "file" | "link" | "youtube" | "web";
  name: string;
  url: string | null;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: "queued" | "processing" | "ready" | "failed";
  createdAt: string;
}

export interface SpaceResourceData {
  id: string;
  spaceId: string;
  assetId: string;
  focused: boolean;
  addedAt: string;
  asset: AssetData;
}

export interface FlashcardData {
  id: string;
  spaceId: string;
  front: string;
  back: string;
  orderIndex: number;
}

export interface QuizQuestionData {
  id: string;
  spaceId: string;
  type: "multiple-choice" | "short-answer" | "true-false" | "fill-in-blank";
  question: string;
  options: string[] | null;
  correctOptions: number[] | null;
  exampleAnswer: string | null;
  matchMode: string | null;
  answer: string | null;
  orderIndex: number;
}

export interface SolveProblemData {
  id: string;
  spaceId: string;
  title: string;
  question: string;
  answer: string | null;
  steps: string[] | null;
  orderIndex: number;
}

export interface DocLineData {
  id: string;
  spaceId: string;
  orderIndex: number;
  type: "h1" | "h2" | "h3" | "bullet" | "number" | "quote" | "plain" | "table";
  text: string;
  tableData: unknown | null;
}

// ─── Error Handling ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // On 401, retry once after 2s (handles Next.js dev cold-start where middleware isn't ready)
    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 2000));
      const retryRes = await fetch(res.url);
      if (retryRes.ok) return retryRes.json();
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res.json();
}

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function fetchFolders(): Promise<FolderData[]> {
  const res = await fetch("/api/folders");
  return handleResponse<FolderData[]>(res);
}

export async function createFolder(data: {
  name: string;
  themeName: string;
  themeColor: string;
  iconName: string;
  isPublic?: boolean;
  joinPreference?: "link" | "web";
}): Promise<FolderData> {
  const res = await fetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<FolderData>(res);
}

export async function updateFolder(
  folderId: string,
  data: Partial<{
    name: string;
    themeName: string;
    themeColor: string;
    iconName: string;
    isPublic: boolean;
    joinPreference: "link" | "web";
  }>
): Promise<FolderData> {
  const res = await fetch(`/api/folders/${folderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<FolderData>(res);
}

export async function deleteFolder(folderId: string): Promise<void> {
  const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
}

export async function joinFolder(
  folderId: string,
  inviteCode: string
): Promise<void> {
  const res = await fetch(`/api/folders/${folderId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
}

// ─── Spaces ──────────────────────────────────────────────────────────────────

export async function fetchSpaces(folderId: string): Promise<SpaceData[]> {
  const res = await fetch(`/api/folders/${folderId}/spaces`);
  return handleResponse<SpaceData[]>(res);
}

export async function createSpace(
  folderId: string,
  data: {
    name: string;
    type: SpaceData["type"];
    category?: "shared" | "private";
    visibility?: "me" | "members" | "public";
  }
): Promise<SpaceData> {
  const res = await fetch(`/api/folders/${folderId}/spaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SpaceData>(res);
}

export async function updateSpace(
  spaceId: string,
  data: Partial<{
    name: string;
    category: "shared" | "private";
    visibility: "me" | "members" | "public";
    isConfigured: boolean;
  }>
): Promise<SpaceData> {
  const res = await fetch(`/api/spaces/${spaceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SpaceData>(res);
}

export async function deleteSpace(spaceId: string): Promise<void> {
  const res = await fetch(`/api/spaces/${spaceId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
}

// ─── Space Resources ─────────────────────────────────────────────────────────

export async function fetchSpaceResources(
  spaceId: string
): Promise<SpaceResourceData[]> {
  const res = await fetch(`/api/spaces/${spaceId}/resources`);
  return handleResponse<SpaceResourceData[]>(res);
}

export async function addSpaceResource(
  spaceId: string,
  assetId: string,
  focused?: boolean
): Promise<SpaceResourceData> {
  const res = await fetch(`/api/spaces/${spaceId}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId, focused: focused ?? true }),
  });
  return handleResponse<SpaceResourceData>(res);
}

// ─── Assets (File Upload) ────────────────────────────────────────────────────

export async function uploadAsset(file: File): Promise<AssetData> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/assets/upload", {
    method: "POST",
    body: formData,
  });
  return handleResponse<AssetData>(res);
}

// ─── AI Chat (Streaming) ────────────────────────────────────────────────────

export async function streamChat(data: {
  spaceId: string;
  message: string;
  focusedResourceIds?: string[];
}): Promise<Response> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res; // caller reads the stream from res.body
}

// ─── AI Generation (Non-Streaming) ──────────────────────────────────────────

export async function generateFlashcards(data: {
  spaceId: string;
  folderId?: string;
  count?: number;
  topic?: string;
  assetIds?: string[];
}): Promise<FlashcardData[]> {
  const res = await fetch("/api/generate/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<FlashcardData[]>(res);
}

export async function generateQuiz(data: {
  spaceId: string;
  folderId?: string;
  count?: number;
  types?: string[];
  language?: string;
  hardMode?: boolean;
  topics?: string;
}): Promise<QuizQuestionData[]> {
  const res = await fetch("/api/generate/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<QuizQuestionData[]>(res);
}

export async function generateSolve(data: {
  spaceId: string;
  question: string;
  title?: string;
}): Promise<SolveProblemData> {
  const res = await fetch("/api/generate/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SolveProblemData>(res);
}

export async function generateStudyGuide(data: {
  spaceId: string;
  topic?: string;
  folderId?: string;
  assetIds?: string[];
}): Promise<DocLineData[]> {
  const res = await fetch("/api/generate/study-guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<DocLineData[]>(res);
}

// ─── AI Generation (Streaming) ──────────────────────────────────────────────

export async function streamNotes(data: {
  spaceId: string;
  folderId?: string;
  assetIds?: string[];
}): Promise<Response> {
  const res = await fetch("/api/generate/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res;
}

export async function streamWrite(data: {
  spaceId: string;
  prompt: string;
  mode: "generate" | "continue" | "improve";
  existingContent?: string;
  tone?: string;
  length?: string;
  lengthUnit?: string;
  tense?: string;
  perspective?: string;
}): Promise<Response> {
  const res = await fetch("/api/generate/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res;
}

export async function streamPolish(data: {
  spaceId: string;
  rawText: string;
}): Promise<Response> {
  const res = await fetch("/api/notes/polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export async function createSubscription(data: {
  billingCycle: "monthly" | "annually";
}): Promise<{ subscriptionId: string; shortUrl: string | null; keyId: string }> {
  const res = await fetch("/api/billing/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ─── Streaming Utility ──────────────────────────────────────────────────────

/**
 * Reads a text stream from a Response and calls onChunk for each text fragment.
 * Resolves with the full accumulated text when the stream ends.
 */
export async function readStream(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    fullText += text;
    onChunk(text);
  }

  return fullText;
}

// ─── Knowledge Items ─────────────────────────────────────────────────────────

export interface KnowledgeItemData {
  id: string;
  folderId: string;
  assetId: string;
  addedAt: string;
  asset: AssetData;
}

export async function fetchKnowledgeItems(
  folderId: string
): Promise<KnowledgeItemData[]> {
  const res = await fetch(`/api/folders/${folderId}/knowledge`);
  return handleResponse<KnowledgeItemData[]>(res);
}

export async function uploadKnowledge(
  folderId: string,
  file: File
): Promise<KnowledgeItemData> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/folders/${folderId}/knowledge`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<KnowledgeItemData>(res);
}

export async function addKnowledgeLink(
  folderId: string,
  url: string,
  name?: string
): Promise<KnowledgeItemData> {
  const res = await fetch(`/api/folders/${folderId}/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, name }),
  });
  return handleResponse<KnowledgeItemData>(res);
}

/**
 * Poll an asset's status until it reaches "ready" or "failed".
 * Resolves with the final status.
 */
export async function pollAssetStatus(
  assetId: string,
  onStatusChange?: (status: string) => void,
  intervalMs = 2000,
  maxAttempts = 60
): Promise<"ready" | "failed"> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    // We'll fetch the knowledge items and find the one with this asset
    // Or we can add a dedicated status endpoint — for now use a lightweight approach
    const res = await fetch(`/api/assets/${assetId}/status`);
    if (res.ok) {
      const { status } = await res.json();
      onStatusChange?.(status);
      if (status === "ready" || status === "failed") {
        return status;
      }
    }
  }
  return "failed";
}

// ─── Doc Lines (for configured spaces) ──────────────────────────────────────

export async function fetchDocLines(
  spaceId: string
): Promise<DocLineData[]> {
  const res = await fetch(`/api/spaces/${spaceId}/lines`);
  return handleResponse<DocLineData[]>(res);
}

export async function saveDocLines(
  spaceId: string,
  lines: Array<{ type: string; text: string; tableData?: unknown }>
): Promise<void> {
  const res = await fetch(`/api/spaces/${spaceId}/lines`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
}

// ─── Messages (chat history) ─────────────────────────────────────────────────

export interface MessageData {
  id: string;
  spaceId: string;
  sender: "user" | "ai";
  text: string;
  createdAt: string;
}

export async function fetchMessages(spaceId: string): Promise<MessageData[]> {
  const res = await fetch(`/api/spaces/${spaceId}/messages`);
  return handleResponse<MessageData[]>(res);
}

// ─── Quiz Questions (fetch existing) ─────────────────────────────────────────

export async function fetchQuizQuestions(
  spaceId: string
): Promise<QuizQuestionData[]> {
  const res = await fetch(`/api/spaces/${spaceId}/quiz`);
  return handleResponse<QuizQuestionData[]>(res);
}

// ─── Quiz Answer Evaluation ──────────────────────────────────────────────────

export async function evaluateQuizAnswer(data: {
  question: string;
  userAnswer: string;
  correctAnswer?: string;
}): Promise<{ correct: boolean; explanation: string; score?: number; improvement?: string }> {
  const res = await fetch("/api/quiz/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ─── Flashcards (fetch existing) ─────────────────────────────────────────────

export async function fetchFlashcards(
  spaceId: string
): Promise<FlashcardData[]> {
  const res = await fetch(`/api/spaces/${spaceId}/flashcards`);
  return handleResponse<FlashcardData[]>(res);
}

// ─── User Profile ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  inviteCode: string;
  subscription: {
    plan: string;
    status: string;
    bonusProUntil: string | null;
    currentPeriodEnd: string | null;
  } | null;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch("/api/me");
  return handleResponse<UserProfile>(res);
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export interface InviteData {
  id: string;
  inviteeId: string | null;
  status: string;
  completedAt: string | null;
  inviteeName: string | null;
  inviteeEmail: string | null;
}

export async function fetchInvites(): Promise<InviteData[]> {
  const res = await fetch("/api/invites");
  return handleResponse<InviteData[]>(res);
}

// ─── Folder Members ──────────────────────────────────────────────────────────

export interface FolderMemberData {
  userId: string;
  role: string;
  joinedAt: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export async function fetchFolderMembers(folderId: string): Promise<FolderMemberData[]> {
  const res = await fetch(`/api/folders/${folderId}/members`);
  return handleResponse<FolderMemberData[]>(res);
}

// ─── Join Folder by Code ─────────────────────────────────────────────────────

export async function joinFolderByCode(code: string): Promise<{ folderId: string }> {
  const res = await fetch("/api/folders/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return handleResponse<{ folderId: string }>(res);
}
