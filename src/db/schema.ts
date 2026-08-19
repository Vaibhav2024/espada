import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  vector,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  inviteCode: text("invite_code").notNull().unique(),
  storageUsedBytes: integer("storage_used_bytes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  userId: text("user_id")
    .references(() => users.id)
    .primaryKey(),
  plan: text("plan", { enum: ["free", "pro"] })
    .default("free")
    .notNull(),
  billingCycle: text("billing_cycle", { enum: ["monthly", "annually"] }),
  status: text("status", { enum: ["active", "cancelled", "past_due"] })
    .default("active")
    .notNull(),
  razorpayCustomerId: text("razorpay_customer_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  bonusProUntil: timestamp("bonus_pro_until"),
});

// ─── Folders ──────────────────────────────────────────────────────────────────

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  themeName: text("theme_name").notNull(),
  themeColor: text("theme_color").notNull(),
  iconName: text("icon_name").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  joinPreference: text("join_preference", { enum: ["link", "web"] })
    .default("link")
    .notNull(),
  ownerId: text("owner_id")
    .references(() => users.id)
    .notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Folder Members ───────────────────────────────────────────────────────────

export const folderMembers = pgTable(
  "folder_members",
  {
    folderId: uuid("folder_id")
      .references(() => folders.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    role: text("role", { enum: ["owner", "member"] })
      .default("member")
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.folderId, table.userId] }),
  })
);

// ─── Assets (unified ingestion target) ───────────────────────────────────────

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  uploaderId: text("uploader_id")
    .references(() => users.id)
    .notNull(),
  type: text("type", { enum: ["file", "link", "youtube", "web"] }).notNull(),
  name: text("name").notNull(),
  url: text("url"),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  status: text("status", { enum: ["queued", "processing", "ready", "failed"] })
    .default("queued")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Asset Chunks (embeddings) ───────────────────────────────────────────────

export const assetChunks = pgTable(
  "asset_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .references(() => assets.id, { onDelete: "cascade" })
      .notNull(),
    ownerId: text("owner_id")
      .references(() => users.id)
      .notNull(),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => ({
    embeddingIdx: index("asset_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

// ─── Knowledge Items (folder-level assets) ───────────────────────────────────

export const knowledgeItems = pgTable("knowledge_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  folderId: uuid("folder_id")
    .references(() => folders.id, { onDelete: "cascade" })
    .notNull(),
  assetId: uuid("asset_id")
    .references(() => assets.id)
    .notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// ─── Invites (personal referral system) ──────────────────────────────────────

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  inviterId: text("inviter_id")
    .references(() => users.id)
    .notNull(),
  inviteeId: text("invitee_id").references(() => users.id),
  status: text("status", { enum: ["pending", "completed"] })
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ─── Spaces ──────────────────────────────────────────────────────────────────

export const spaces = pgTable("spaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  folderId: uuid("folder_id")
    .references(() => folders.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type", {
    enum: [
      "study-guide",
      "quiz",
      "flashcards",
      "solve",
      "write",
      "recording",
      "notes",
      "chat",
      "default",
    ],
  }).notNull(),
  category: text("category", { enum: ["shared", "private"] })
    .default("shared")
    .notNull(),
  visibility: text("visibility", { enum: ["me", "members", "public"] })
    .default("public")
    .notNull(),
  isConfigured: boolean("is_configured").default(false).notNull(),
  transcriptSegments: jsonb("transcript_segments"),
  createdBy: text("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Space Resources ─────────────────────────────────────────────────────────

export const spaceResources = pgTable("space_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  assetId: uuid("asset_id")
    .references(() => assets.id)
    .notNull(),
  focused: boolean("focused").default(true).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// ─── Doc Lines (Write / Notes / Recording / StudyGuide) ──────────────────────

export const docLines = pgTable("doc_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  orderIndex: integer("order_index").notNull(),
  type: text("type", {
    enum: ["h1", "h2", "h3", "bullet", "number", "quote", "plain", "table"],
  }).notNull(),
  text: text("text").default("").notNull(),
  tableData: jsonb("table_data"),
});

// ─── Messages (Chat) ────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  sender: text("sender", { enum: ["user", "ai"] }).notNull(),
  text: text("text").notNull(),
  focusedResourceIds: jsonb("focused_resource_ids"),
  problemId: uuid("problem_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Quiz Questions ──────────────────────────────────────────────────────────

export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type", {
    enum: ["multiple-choice", "short-answer", "true-false", "fill-in-blank"],
  }).notNull(),
  question: text("question").notNull(),
  options: jsonb("options"),
  correctOptions: jsonb("correct_options"),
  exampleAnswer: text("example_answer"),
  matchMode: text("match_mode"),
  answer: text("answer"),
  orderIndex: integer("order_index").notNull(),
});

// ─── Flashcards ──────────────────────────────────────────────────────────────

export const flashcards = pgTable("flashcards", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  orderIndex: integer("order_index").notNull(),
});

// ─── Solve Problems ──────────────────────────────────────────────────────────

export const solveProblems = pgTable("solve_problems", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  steps: jsonb("steps"),
  orderIndex: integer("order_index").notNull(),
});
