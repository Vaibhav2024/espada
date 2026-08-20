# Espada

An AI-powered study workspace that helps students and professionals learn faster. Upload documents, record lectures, generate flashcards, take quizzes, and chat with AI about your study material — all in one place.

**Live:** [mytestingdomain.co.in](https://mytestingdomain.co.in)  
**Repository:** [github.com/Vaibhav2024/espada](https://github.com/Vaibhav2024/espada.git)

---

## Features

### Study Tools
- **Study Guide** — Generate structured study guides from uploaded documents
- **Quiz** — AI-generated multiple choice, short answer, true/false, and fill-in-the-blank questions
- **Flashcards** — Create AI-powered flashcards from your knowledge base
- **Solve** — Get step-by-step explanations for problems
- **Write** — AI-assisted writing with tone, length, and perspective controls
- **Notes** — AI-generated notes from documents with a rich block editor
- **Recording** — Real-time lecture recording using Web Speech API with live transcription and AI-powered note generation
- **Chat** — Conversational AI that references your uploaded documents (RAG)

### Platform
- **Folders & Spaces** — Organize your work into folders with multiple spaces per folder
- **Knowledge Base** — Upload PDFs, DOCX, PPTX, TXT, MD files or paste links/YouTube URLs. Documents are chunked, embedded, and stored for RAG retrieval
- **Collaboration** — Invite members to folders via 6-digit invite codes or invite links. Members see shared spaces; private spaces remain private
- **Recording with Web Speech API** — Browser-based speech-to-text (zero cost), with intelligent transcription cleaning via LLM
- **Razorpay Subscriptions** — Pro plan with test-mode Razorpay integration (monthly/annual billing)
- **Personal Referral System** — Invite friends, earn +1 day of Pro per completed signup
- **Visibility Controls** — Per-space access control (Just me / Folder members / Public)
- **Dark Mode** — Full dark theme UI built with Tailwind CSS

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| UI | Tailwind CSS 4, Radix UI, Framer Motion, Lucide Icons |
| Database | PostgreSQL 16 + pgvector (vector embeddings) |
| ORM | Drizzle ORM |
| Cache/Queue | Redis 7 + BullMQ (async document processing) |
| Auth | Clerk (OAuth, webhooks) |
| AI | OpenAI GPT-4o-mini (via Vercel AI SDK) |
| Payments | Razorpay (subscriptions, webhooks) |
| Speech | Web Speech API (webkitSpeechRecognition) |
| Deployment | Docker Compose + Caddy (auto-HTTPS) |

---

## Project Structure

```
espada/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/
│   │   │   ├── billing/        # Razorpay subscription creation
│   │   │   ├── chat/           # Streaming AI chat
│   │   │   ├── folders/        # CRUD folders, members, join by code
│   │   │   ├── generate/       # AI generation (flashcards, quiz, notes, recording, etc.)
│   │   │   ├── invites/        # Personal invite history
│   │   │   ├── me/             # User profile endpoint
│   │   │   ├── notes/          # Polish & structure endpoints
│   │   │   ├── spaces/         # CRUD spaces, lines, resources, messages
│   │   │   └── webhooks/       # Clerk & Razorpay webhook handlers
│   │   ├── dashboard/          # Main dashboard page
│   │   ├── invite/             # Referral invite landing page
│   │   ├── join/               # Folder join page (6-digit code input)
│   │   ├── sign-in/            # Clerk sign-in
│   │   └── sign-up/            # Clerk sign-up (with referral code passthrough)
│   ├── components/
│   │   ├── study/              # Study tool views (RecordingView, ChatView, QuizEditor, etc.)
│   │   ├── workspace/          # Dashboard components (FolderSidebar, MembersPanel, etc.)
│   │   └── ui/                 # Radix/shadcn UI primitives
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema (users, folders, spaces, invites, etc.)
│   │   └── index.ts            # Database connection
│   └── lib/
│       ├── ai.ts               # LLM wrapper with fallback (OpenAI)
│       ├── auth.ts             # Clerk auth helpers + plan check
│       ├── authorize-space.ts  # Shared space visibility enforcement
│       ├── invite-code.ts      # 6-char uppercase alphanumeric code generator
│       ├── quota.ts            # Redis-based daily usage limits
│       ├── razorpay-checkout.ts# Client-side Razorpay checkout utility
│       ├── redis.ts            # Redis connection factory
│       ├── resolve-folder.ts   # "default" folder resolution logic
│       └── api.ts              # Client-side typed API wrappers
├── worker/                     # BullMQ worker for document processing
├── drizzle/                    # SQL migrations
├── scripts/                    # Migration & utility scripts
├── docker-compose.yml          # Full stack (Postgres, Redis, App, Worker, Caddy)
├── Dockerfile                  # App container
├── Dockerfile.worker           # Worker container
└── Caddyfile                   # Reverse proxy with auto-TLS
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **bun** (package manager) — or use npm/yarn
- **Docker & Docker Compose** (for Postgres + Redis)
- **Clerk account** (authentication)
- **OpenAI API key** (AI features)
- **Razorpay test account** (optional, for payments)

### 1. Clone the repository

```bash
git clone https://github.com/Vaibhav2024/espada.git
cd espada
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Postgres & Redis (matches docker-compose defaults)
DATABASE_URL=postgresql://espada:localdev@127.0.0.1:5433/espada
REDIS_URL=redis://:localdev@127.0.0.1:6379

# Clerk (get from clerk.com dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...

# Razorpay (optional — test keys from razorpay.com dashboard)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_MONTHLY=plan_...   # (auto-created if not set)
RAZORPAY_PLAN_ANNUALLY=plan_...  # (auto-created if not set)
```

### 4. Start the database

```bash
docker compose up -d postgres redis
```

### 5. Push the schema to the database

```bash
bun run db:push
```

Or run migrations manually:

```bash
node scripts/migrate.mjs
```

### 6. Start the development server

```bash
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 7. Start the background worker (for document processing)

In a separate terminal:

```bash
bun run worker
```

---

## Production Deployment

The project includes a full Docker Compose setup for production:

```bash
# Set production env vars in .env
docker compose up -d
```

This starts:
- **Postgres** (pgvector) on port 5433
- **Redis** on port 6379
- **App** (Next.js) on port 3000
- **Worker** (BullMQ document processor)
- **Caddy** (reverse proxy with automatic HTTPS)

Configure your domain in the `Caddyfile`:

```
yourdomain.com {
    reverse_proxy app:3000
}
```

---

## Razorpay Test Mode

To test payments:

1. Create a Razorpay test account at [razorpay.com](https://razorpay.com)
2. Get your `rzp_test_` prefixed Key ID and Key Secret
3. Add them to `.env.local`
4. Use test card: `4111 1111 1111 1111` (any future expiry, any CVV)
5. Or test UPI: `success@razorpay`

Plans are auto-created on first checkout if `RAZORPAY_PLAN_MONTHLY` / `RAZORPAY_PLAN_ANNUALLY` env vars aren't set.

---

## Clerk Webhooks

Set up a Clerk webhook pointing to `https://yourdomain.com/api/webhooks/clerk` with the following events:
- `user.created`
- `user.updated`
- `user.deleted`

The `user.created` webhook handles:
- Creating the user row in the database
- Processing referral codes (personal invite system)
- Granting bonus Pro days to inviters

---

## Key Architecture Decisions

- **Web Speech API for recording** — Free browser-based transcription (Chrome/Edge). No audio uploaded to servers, only text leaves the browser.
- **Single LLM call on Stop** — Instead of frequent small calls during recording, one call processes the full transcript segment on Stop. Better token efficiency.
- **Streaming responses** — All AI-generated content streams to the UI in real-time for better UX.
- **Shared space authorization** — Enforced server-side on every space-scoped endpoint, not just in the UI.
- **6-char alphanumeric invite codes** — Uppercase A-Z + 0-9, easy to read and type. Case-insensitive matching on join.

---

## Known Gaps / Future Work

- No abuse prevention on personal referral system (self-referral via multiple accounts)
- Web Speech API only works in Chrome/Edge — graceful degradation message shown for other browsers
- Quiz evaluation uses LLM-based grading which may not be 100% accurate for all question types

---

## License

Private project. All rights reserved.
