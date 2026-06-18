# Contract AI — App Plan

**Source:** PRD v1.1 (June 10, 2026)
**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Azure AI · pdfjs-dist · mammoth

---

## Overview

A three-panel AI document analysis app. Users sign up, upload a PDF or DOCX contract, ask questions, and receive grounded answers from an Azure AI agent. Every session, message, and feedback rating is persisted in Supabase.

**Primary flow:**
```
/ (redirect) → /login → /signup → /dashboard → /chat → Upload doc → Ask question → AI response → Feedback
```

---

## File Structure

```
/
├── app/
│   ├── layout.tsx                    ← root layout (globals.css)
│   ├── page.tsx                      ← redirect → /login
│   ├── login/
│   │   └── page.tsx                  ← login page (light mode)
│   ├── signup/
│   │   └── page.tsx                  ← signup page (light mode)
│   ├── dashboard/
│   │   └── page.tsx                  ← KPI grid + recent sessions
│   ├── chat/
│   │   └── page.tsx                  ← three-panel chat shell
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts       ← POST: hash + insert user
│       │   ├── login/route.ts        ← POST: verify + return userId
│       │   └── microsoft/
│       │       ├── route.ts          ← GET: generate MS login URL
│       │       └── callback/route.ts ← GET: exchange code → cookie
│       ├── sessions/
│       │   ├── route.ts              ← GET list, POST create
│       │   └── [id]/route.ts         ← PATCH rename/pin, DELETE
│       ├── messages/
│       │   └── route.ts              ← GET history, POST save
│       ├── chat/
│       │   └── route.ts              ← POST: contractText + userMessage → Azure → response
│       └── feedback/
│           └── route.ts              ← POST: rating + comment
├── components/
│   ├── Sidebar.tsx                   ← session list, new chat, user footer
│   ├── ChatArea.tsx                  ← message list + composer
│   ├── RightPanel.tsx                ← execution steps + document preview
│   ├── MessageBubble.tsx             ← user/assistant bubble rendering
│   ├── FileUpload.tsx                ← PDF/DOCX picker, parsing, callback
│   ├── FeedbackForm.tsx              ← 1–5 star + optional comment
│   └── SessionContextMenu.tsx        ← pin, rename, delete actions
├── lib/
│   ├── supabase.ts                   ← Supabase client (env vars)
│   ├── db.ts                         ← all DB helper functions
│   └── azure.ts                      ← MSAL token helper (server-only)
├── blueprint/
│   └── app-plan.md                   ← this file
├── .env.local.example
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Phase Plan

### Phase 1 — Project Setup ✅
- Next.js 14, TypeScript, Tailwind, all dependencies
- CSS variables (dark/light), Google Fonts, design tokens
- `.env.local.example`, `lib/supabase.ts`

---

### Phase 2 — Database Helpers (`lib/db.ts`)

All DB access goes through typed helper functions. No raw Supabase calls in components or API routes.

| Function | Query | Returns |
|---|---|---|
| `getUser(email)` | `SELECT * FROM users WHERE email = $1` | `User \| null` |
| `createUser(email, passwordHash)` | `INSERT INTO users ...` | `User` |
| `createSession(userId, title)` | `INSERT INTO sessions ...` | `Session` |
| `getSessions(userId)` | `SELECT * FROM sessions WHERE user_id = $1 ORDER BY pinned DESC, updated_at DESC` | `Session[]` |
| `getSession(id)` | `SELECT * FROM sessions WHERE id = $1` | `Session \| null` |
| `updateSession(id, fields)` | `UPDATE sessions SET ... WHERE id = $1` | `Session` |
| `deleteSession(id)` | `DELETE FROM sessions WHERE id = $1` | `void` |
| `createMessage(sessionId, role, content)` | `INSERT INTO messages ...` | `Message` |
| `getMessages(sessionId, limit, before?)` | `SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2` | `Message[]` |
| `createFeedback(userId, sessionId, rating, comment?)` | `INSERT INTO feedback ...` | `Feedback` |

---

### Phase 3 — Auth

**Signup** (`/signup`):
1. Client validates email format + password ≥ 8 chars
2. `POST /api/auth/signup` — checks `users` table for duplicate email
3. `bcryptjs.hash(password, 10)` — insert into `users`
4. Return `{ userId, email }` — store both in `localStorage`
5. Redirect to `/dashboard`

**Login** (`/login`):
1. Client validates non-empty fields
2. `POST /api/auth/login` — query `users` by email
3. `bcryptjs.compare(password, hash)` — return generic error on any mismatch
4. Return `{ userId, email }` — store both in `localStorage`
5. Redirect to `/dashboard`

**Auth guard** — every protected page checks `localStorage.getItem('userId')` on mount; redirect to `/login` if absent.

**Logout** — clear `userId` + `userEmail` from localStorage, redirect to `/login`.

---

### Phase 4 — Dashboard Layout

Three-panel shell defined in `app/chat/page.tsx` (reused as the app shell):

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar 256px       │  Chat area flex-1   │  Right 304px    │
│  bg-an-bg-subtle     │  bg-an-bg-base      │  bg-an-bg-subtle│
└──────────────────────────────────────────────────────────────┘
```

**Sidebar** (top → bottom):
- Logo + "Contract AI" wordmark (24px padding)
- "New chat" primary button (full width, coral accent)
- Search input (client-side filter)
- Filter tabs: All / Pinned / Recent / Processing / Completed / Error
- Session list (scrollable, each item: title truncated 1 line, date right-aligned, status dot)
- User footer: email + logout button (pinned bottom)

**Dashboard** (`/dashboard`) is a separate page:
- Auth guard on mount
- KPI card grid (3-col): 13 metrics derived from Supabase on load
- Recent sessions: last 5 as quick-access cards

---

### Phase 5 — Chat Interface

**`ChatArea.tsx`** owns:
- `messages: Message[]`
- `streamingContent: string`
- `isLoading: boolean`

**`MessageBubble.tsx`**:
- User: right-aligned, `bg-an-accent-subtle`, border `rgba(217,119,87,0.20)`, border-radius `12px 12px 4px 12px`
- Assistant: left-aligned, no bubble, small coral dot prefix, full max-width 680px

**`FileUpload.tsx`** — calls `onFileLoaded(text, filename, previewUrl, fileType)` — owns no state.

**`app/chat/page.tsx`** owns:
- `contractText: string`
- `filename: string`
- `previewUrl: string`
- `fileType: string`
- `activeSessionId: string | null`
- `sessions: Session[]`

---

### Phase 6 — File Parsing

**PDF** (pdfjs-dist v4, client-side):
1. Copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` → `public/pdf.worker.min.mjs`
2. `GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'`
3. Extract text page by page — detect scanned (0 chars) and block with error
4. Create blob URL before parsing: `URL.createObjectURL(file)` — pass alongside text

**DOCX** (mammoth, client-side):
1. `mammoth.extractRawText({ arrayBuffer })` → plain text
2. No preview blob URL (render extracted text in right panel, truncated at 4,000 chars)

**Validation:**
- File type: `.pdf` / `.docx` only — error "Only PDF and DOCX files are supported"
- File size: max 10 MB — error "File exceeds the 10 MB limit"
- Empty PDF: "This PDF appears to be scanned. Please upload a text-based PDF."

---

### Phase 7 — Azure AI Chat Route (`/api/chat`)

1. Read Bearer token from HTTP-only cookie `azure_token` — return 401 if missing
2. Read `{ contractText, userMessage, sessionId }` from request body
3. Auto-save user message to Supabase (`createMessage`)
4. Create thread: `POST {AZURE_AGENT_ENDPOINT_URL}/threads?api-version=2025-05-01`
5. Add message to thread (system prompt + contractText as context + userMessage)
6. Run thread: `POST .../threads/{threadId}/runs` with `AZURE_AGENT_ID`
7. Poll run status every 1.5s until `completed` or `failed` (timeout: 60s)
8. Retrieve assistant message from thread
9. Save assistant message to Supabase
10. Update session `updated_at` and `status`
11. Auto-generate title if session title is still "New session" (first 55 chars of userMessage + `…`)
12. Return `{ message, sessionId, title }`

**System prompt injected with every run:**
> "You are an AI assistant. Answer questions based solely on the document text provided. Always cite the specific section or part you are referencing. If the answer cannot be found in the provided text, say: 'I cannot find this in the document.' Do not speculate beyond what the document contains."

---

### Phase 8 — Right Panel Execution Steps + Preview

**Execution steps** (5 states, shown during every AI request):
| Step | Trigger | Icon |
|---|---|---|
| Parsing document | File loaded | `FileText` |
| Sending to AI | Request starts | `Send` |
| Waiting for response | Polling | `Loader` (spin) |
| Processing response | Run completed | `Cpu` |
| Completed / Error | Final state | `CheckCircle` / `XCircle` |

**Document preview** (persists while chatting):
- PDF: `<iframe src={previewUrl} />` with zoom controls and page count overlay; download button
- DOCX: scrollable `<pre>` with JetBrains Mono, text truncated at 4,000 chars with notice

---

### Phase 9 — Feedback + Polish

**FeedbackForm** appears below every assistant message bubble:
- 5 star buttons (Lucide `Star`, fill on select)
- Optional textarea for comment
- `POST /api/feedback` on submit
- Dismissed after submit (replaced with "Thanks for your feedback" chip)

**Session management from context menu** (`SessionContextMenu.tsx`):
- Pin/unpin → `PATCH /api/sessions/[id]` `{ pinned: true/false }`
- Rename → inline input, confirm Enter → `PATCH /api/sessions/[id]` `{ title }`
- Delete → confirmation dialog → `DELETE /api/sessions/[id]` (cascade in DB)

---

## API Routes Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | None | Create user |
| POST | `/api/auth/login` | None | Verify user, return userId |
| GET | `/api/auth/microsoft` | None | Redirect to MS login |
| GET | `/api/auth/microsoft/callback` | None | Exchange code, set cookie |
| GET | `/api/sessions` | userId header | List sessions for user |
| POST | `/api/sessions` | userId header | Create new session |
| PATCH | `/api/sessions/[id]` | userId header | Rename or pin/unpin |
| DELETE | `/api/sessions/[id]` | userId header | Delete session + cascade |
| GET | `/api/messages?sessionId=` | userId header | Load message history |
| POST | `/api/messages` | userId header | Save a message |
| POST | `/api/chat` | azure_token cookie | Full AI turn |
| POST | `/api/feedback` | userId header | Save rating + comment |

---

## State Architecture

The `app/chat/page.tsx` component is the single source of truth for all shared state:

| State | Type | Used by |
|---|---|---|
| `activeSessionId` | `string \| null` | Sidebar (highlight), ChatArea (send), API calls |
| `sessions` | `Session[]` | Sidebar list |
| `messages` | `Message[]` | ChatArea |
| `contractText` | `string` | `/api/chat` payload |
| `filename` | `string` | RightPanel header, FileUpload chip |
| `previewUrl` | `string` | RightPanel iframe |
| `fileType` | `string` | RightPanel renderer choice |
| `isLoading` | `boolean` | Composer disabled state, execution steps |
| `executionStep` | `0–4` | RightPanel step indicators |

---

## Database Schema

See full SQL in the section below.

### Tables
- `users` — custom auth, bcrypt passwords
- `sessions` — one per conversation; tracks title, status, pinned
- `messages` — all turns; role = 'user' | 'assistant'
- `feedback` — 1–5 star ratings + optional comment per assistant message

### Indexes (performance)
- `sessions(user_id, updated_at DESC)` — sidebar list query
- `messages(session_id, created_at ASC)` — history load
- `feedback(session_id)` — per-session rating aggregation

---

## Database Schema — Complete SQL

```sql
-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'New session',
  status     TEXT        NOT NULL DEFAULT 'idle'
               CHECK (status IN ('idle', 'processing', 'completed', 'error')),
  pinned     BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_updated_idx
  ON sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS sessions_user_pinned_idx
  ON sessions (user_id, pinned);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_updated_at_trigger ON sessions;
CREATE TRIGGER sessions_updated_at_trigger
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_sessions_updated_at();

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_session_created_idx
  ON messages (session_id, created_at ASC);

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rating     INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_session_idx ON feedback (session_id);
CREATE INDEX IF NOT EXISTS feedback_user_idx    ON feedback (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Enable RLS on all tables (required for Supabase)
ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- NOTE: This app uses a custom server-side auth pattern (userId passed
-- via request header, not Supabase JWT). All DB access goes through
-- Next.js API routes using the service role key — RLS policies are
-- intentionally permissive at the DB level and enforced in API route
-- logic. Before public launch, tighten these policies if you switch
-- to Supabase JWT auth.

CREATE POLICY "service_role_all_users"    ON users    FOR ALL USING (true);
CREATE POLICY "service_role_all_sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "service_role_all_messages" ON messages FOR ALL USING (true);
CREATE POLICY "service_role_all_feedback" ON feedback FOR ALL USING (true);
```

> **Run this SQL** in your Supabase project under **SQL Editor → New query**. Run it once — all `CREATE TABLE IF NOT EXISTS` statements are idempotent.

> **Service role key:** Use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) in your API routes so that RLS does not block server-side writes. Never expose the service role key to the client.

---

## Environment Variables Checklist

Before running the app, `.env.local` must contain:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          ← server-only, never expose to client

# Azure App Registration (OAuth)
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=

# Azure AI Agent
AZURE_AGENT_ENDPOINT_URL=           ← https://<name>.services.ai.azure.com/api/projects/<project>
AZURE_AGENT_ID=                     ← asst_xxx format only

# App
NEXTAUTH_URL=http://localhost:3000
```

---

## Design Constraints (non-negotiable)

- **Dark mode everywhere** except `/login` and `/signup` (use `data-theme="light"` on `<html>`)
- **No Supabase Auth** — custom `users` table + bcryptjs only
- **No Azure calls from client** — all Azure API calls in `/api/chat` only
- **Tokens in HTTP-only cookie** — never localStorage
- **File parsing client-side** — never upload raw file to any server
- **No emoji in UI copy** — sentence case, active voice
- **Lucide icons only** — stroke-width 1.5, size 16px default
