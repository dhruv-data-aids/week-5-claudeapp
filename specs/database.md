# Database Spec — Supabase Schema and Helpers

## Feature Name
Database Schema and Helper Functions

---

## Description

All persistent data lives in a Supabase PostgreSQL database. The app uses four tables: `users`,
`sessions`, `messages`, and `feedback`. All DB access goes through typed helper functions in
`lib/db.ts` — no raw Supabase queries in components or API routes. The service role key
(`SUPABASE_SERVICE_ROLE_KEY`) is used server-side to bypass RLS; the anon key is only used
for the client-side Supabase instance (not used for writes).

---

## Tables

### `users`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| email | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |

Index: `users_email_idx ON users(email)`

---

### `sessions`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| user_id | UUID | NOT NULL, FK → users.id ON DELETE CASCADE |
| title | TEXT | NOT NULL, default `'New session'` |
| status | TEXT | NOT NULL, default `'idle'`, CHECK IN (`'idle'`, `'processing'`, `'completed'`, `'error'`) |
| pinned | BOOLEAN | NOT NULL, default `false` |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, default `now()`, auto-updated by trigger |

Indexes:
- `sessions_user_updated_idx ON sessions(user_id, updated_at DESC)` — sidebar list query
- `sessions_user_pinned_idx ON sessions(user_id, pinned)` — pinned filter

Trigger: `sessions_updated_at_trigger` — `BEFORE UPDATE` sets `updated_at = now()` automatically.

---

### `messages`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| session_id | UUID | NOT NULL, FK → sessions.id ON DELETE CASCADE |
| role | TEXT | NOT NULL, CHECK IN (`'user'`, `'assistant'`) |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |

Index: `messages_session_created_idx ON messages(session_id, created_at ASC)` — history load

---

### `feedback`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| user_id | UUID | NOT NULL, FK → users.id ON DELETE CASCADE |
| session_id | UUID | NOT NULL, FK → sessions.id ON DELETE CASCADE |
| rating | INTEGER | NOT NULL, CHECK BETWEEN 1 AND 5 |
| comment | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |

Indexes:
- `feedback_session_idx ON feedback(session_id)` — per-session rating aggregation
- `feedback_user_idx ON feedback(user_id)` — per-user feedback queries

---

## Row Level Security

RLS is enabled on all tables. Because this app uses a custom server-side auth pattern
(userId in request header, not Supabase JWT), all writes go through API routes using the
service role key — policies are permissive at DB level and enforced in API route logic.

```sql
CREATE POLICY "service_role_all_users"    ON users    FOR ALL USING (true);
CREATE POLICY "service_role_all_sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "service_role_all_messages" ON messages FOR ALL USING (true);
CREATE POLICY "service_role_all_feedback" ON feedback FOR ALL USING (true);
```

Before public launch: tighten these policies if switching to Supabase JWT auth.

---

## Helper Functions — `lib/db.ts`

All functions are `async`, typed with TypeScript interfaces, and use the service role client.

### TypeScript Types

```typescript
interface User {
  id: string
  email: string
  password_hash: string
  created_at: string
}

interface Session {
  id: string
  user_id: string
  title: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  pinned: boolean
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Feedback {
  id: string
  user_id: string
  session_id: string
  rating: number
  comment: string | null
  created_at: string
}
```

### Function Signatures

| Function | Description | Returns |
|---|---|---|
| `getUser(email: string)` | Lookup user by email | `User \| null` |
| `createUser(email: string, passwordHash: string)` | Insert new user | `User` |
| `createSession(userId: string, title?: string)` | Insert session, default title `'New session'` | `Session` |
| `getSessions(userId: string)` | All sessions for user, pinned first then by `updated_at DESC` | `Session[]` |
| `getSession(id: string)` | Single session by id | `Session \| null` |
| `updateSession(id: string, fields: Partial<Pick<Session, 'title' \| 'status' \| 'pinned'>>)` | Patch session fields | `Session` |
| `deleteSession(id: string)` | Delete session (cascades messages + feedback) | `void` |
| `createMessage(sessionId: string, role: 'user' \| 'assistant', content: string)` | Insert message | `Message` |
| `getMessages(sessionId: string, limit?: number, before?: string)` | Fetch messages ASC, optional cursor | `Message[]` |
| `createFeedback(userId: string, sessionId: string, rating: number, comment?: string)` | Insert feedback row | `Feedback` |

---

## Supabase Client Setup

**`lib/supabase.ts`** — client-side (anon key, public):
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**`lib/db.ts`** — server-side only (service role key):
```typescript
import { createClient } from '@supabase/supabase-js'
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

Never import `lib/db.ts` from client components — it contains the service role key.

---

## Dashboard KPI Queries

KPI metrics are derived on-read from existing tables (no separate analytics table in MVP).
All queries are scoped to `user_id` and executed in a single batch on dashboard load.

| KPI | Query |
|---|---|
| Total sessions | `COUNT(*) FROM sessions WHERE user_id = $1` |
| Sessions this week | `COUNT(*) FROM sessions WHERE user_id = $1 AND created_at > now() - interval '7 days'` |
| Total messages (user role) | `COUNT(*) FROM messages m JOIN sessions s ON m.session_id = s.id WHERE s.user_id = $1 AND m.role = 'user'` |
| Messages this week | Same + `AND m.created_at > now() - interval '7 days'` |
| Pinned sessions | `COUNT(*) FROM sessions WHERE user_id = $1 AND pinned = true` |
| Average feedback rating | `AVG(rating) FROM feedback WHERE user_id = $1` |
| Failed sessions | `COUNT(*) FROM sessions WHERE user_id = $1 AND status = 'error'` |
| Active sessions (last 7 days) | `COUNT(DISTINCT session_id) FROM messages m JOIN sessions s ON m.session_id = s.id WHERE s.user_id = $1 AND m.created_at > now() - interval '7 days'` |

---

## Environment Variables

| Variable | Location | Use |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key | Client-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key | Server-side only (never expose) |

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| `getUser` returns no row | Return `null`; caller handles 404/401 |
| `createUser` on duplicate email | Supabase returns unique constraint error; API route catches and returns 409 |
| `deleteSession` — session has messages and feedback | `ON DELETE CASCADE` handles it automatically |
| `getMessages` — session has 0 messages | Return empty array `[]` |
| `createMessage` on non-existent session_id | FK constraint violation → API route returns 400 |
| Service role key missing from env | `createClient` will throw on first query — check env on startup |
| Supabase unreachable | Helper functions throw; API routes catch and return 503 |
