# Chat Spec — AI Conversation Interface

## Feature Name
Chat Interface — Document upload, AI conversation, and response display

---

## Description

The chat page (`/chat`) is the core of the app. A user uploads a PDF or DOCX contract,
types a question, and receives a grounded answer from an Azure AI agent. Responses arrive
as a complete JSON payload (no streaming in MVP — v1.1). Every user message is saved to
Supabase before the API call. Every assistant response is saved after it arrives. Sessions
and messages persist across page reloads.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar 256px       │  Chat center flex-1     │  Right 304px│
│  bg-an-bg-subtle     │  bg-an-bg-base          │ bg-an-bg-subtle│
│  (see sessions.md)   │  message list (scroll)  │ exec steps  │
│                      │  composer (pinned bot)  │ + doc preview│
└──────────────────────────────────────────────────────────────┘
```

---

## State Architecture

`/app/chat/page.tsx` is the single source of truth. All state lives here.

| State | Type | Used by |
|---|---|---|
| `activeSessionId` | `string \| null` | All API calls, sidebar highlight |
| `sessions` | `Session[]` | Sidebar |
| `messages` | `Message[]` | ChatArea → MessageList |
| `contractText` | `string` | `/api/chat` payload |
| `filename` | `string` | FileUpload chip, RightPanel header |
| `previewUrl` | `string` | RightPanel iframe / text preview |
| `fileType` | `string` | RightPanel renderer choice (`'pdf'` \| `'docx'`) |
| `isLoading` | `boolean` | Composer disabled, execution step animation |
| `executionStep` | `0–4` | RightPanel step indicators |
| `userId` | `string` | Read from localStorage on mount |

---

## User Flow

1. Auth guard on mount — redirect to `/login` if no `userId`
2. If `?session={id}` in URL: load messages for that session
3. If no session param: chat area is empty, awaiting "New chat" or session select
4. User attaches a file via `FileUpload` → `contractText`, `filename`, `previewUrl`, `fileType` set in parent
5. User types a question in the composer and clicks Send (or `Enter`)
6. Optimistic user message appended to `messages[]`
7. `isLoading = true`, `executionStep = 0`
8. `POST /api/messages` — save user message (auto-save before AI call)
9. `POST /api/chat` — sends `{ contractText, userMessage, sessionId }`
10. Right panel cycles through execution steps (1 → 2 → 3 → 4)
11. Response arrives → assistant message appended to `messages[]`
12. `isLoading = false`, `executionStep = 4` (completed)
13. FeedbackForm appears below the assistant message
14. Session title auto-updated if still `'New session'`
15. Sidebar session list refreshed

---

## Shared Context State

`contractText` is the critical shared state. It must live in the chat page (parent), not
in `FileUpload`. The file upload component fires `onFileLoaded(text, filename, previewUrl, fileType)`
and holds no state itself.

When the user switches sessions: `contractText` is **cleared** (not preserved). The user
must re-attach the document after reopening a past session. This is by design (GDPR —
document text not persisted server-side).

---

## Message Rendering

**User messages:**
- Alignment: right, max-width 75% of chat area
- Background: `an-accent-subtle` (`rgba(217,119,87,0.15)`)
- Border: `1px solid rgba(217,119,87,0.20)`
- Border-radius: `12px 12px 4px 12px`
- Padding: 12px 16px
- Font: 14px/400, `text-an-fg-base`

**Assistant messages:**
- Alignment: left, max-width 680px (full width)
- Background: none — text directly on `an-bg-base`
- Prefix: small coral dot (6px, `bg-an-accent`) or Claude-style icon (16px), left of first line
- No bubble border
- Font: 14px/400, `text-an-fg-base`
- Followed by `FeedbackForm` (see feedback.md)

**Message timestamps:**
- Format: `HH:MM` (24h) for messages from today
- Format: `MMM D, HH:MM` for messages older than today
- Placement: below the bubble, `text-an-fg-muted`, 12px
- Shown on every message

**Markdown rendering:** not rendered in MVP — plain text only. Links in assistant responses
are rendered as plain text. (v1.1 enhancement: add react-markdown.)

**Long messages:** rendered in full — no truncation.

---

## Composer

Fixed to the bottom of the chat center column. Max-width 680px, centered.

```
┌─────────────────────────────────────────────────────┐
│  [📎 Attach]  Type your question...          [Send] │
└─────────────────────────────────────────────────────┘
```

- Container: `bg-an-bg-surface`, border `1px an-border-base`, border-radius 12px, padding 12px 16px
- Textarea: transparent bg, no border, resize none, auto-expand up to 200px, 14px/400
- Send button: `bg-an-accent`, 32px circle, `ArrowUp` icon (Lucide), bottom-right corner
- Attach button: ghost, `Paperclip` icon (16px), left of textarea
- Disabled state (while loading): textarea read-only, send button `opacity-50 cursor-not-allowed`
- Send on: button click OR `Ctrl+Enter` / `Cmd+Enter` (plain `Enter` adds newline)
- Empty or whitespace-only message: send button disabled, no submit

**File chip (when file attached):**
- Shown above the textarea inside the composer container
- `FileText` icon (14px) + filename (truncated 30 chars) + `X` dismiss button
- Background: `an-bg-elevated`, border-radius 4px, padding 4px 8px, 12px/400

---

## Conversation History Loading

When a session is selected (from sidebar or `?session=` URL param):
1. Immediately clear `messages[]` — prevent flash of previous session's messages
2. `GET /api/messages?sessionId={id}` — fetch all messages, ordered `created_at ASC`
3. Show skeleton loader (3 rows, alternating left/right alignment) while fetching
4. Replace skeleton with loaded messages
5. Scroll to bottom after load
6. On error: show "Could not load messages. Try again." with retry button

**Pagination (MVP):** All messages loaded at once. Infinite scroll (25 per page) is a P1/v1.1 feature.

---

## Auto-Generated Session Titles

- Trigger: after the **first** assistant response in a session
- Condition: only if `session.title === 'New session'` (never overwrite a manual rename)
- Source: first 55 characters of the user's first message + `…`
- Implementation: `PATCH /api/sessions/[id]` `{ title }` after AI response arrives
- UI update: update `sessions[]` in parent state optimistically

---

## Streaming Responses

**MVP:** Not implemented. Full response returned as a single JSON payload from `/api/chat`.
A "thinking" indicator (three animated dots) is shown in the chat area while `isLoading = true`.

**v1.1:** SSE streaming — token-by-token display via `ReadableStream`.

---

## API Routes

### `POST /api/chat`
**Auth:** requires `azure_token` HTTP-only cookie — returns 401 if missing

**Request body:**
```json
{
  "contractText": "full extracted document text...",
  "userMessage": "What are the termination clauses?",
  "sessionId": "uuid"
}
```

**Success response:**
```json
{
  "message": "The termination clauses are found in Section 8...",
  "sessionId": "uuid",
  "title": "What are the termination clau…"
}
```

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ error: "Not connected to Azure. Please reconnect." }` | Missing cookie |
| 400 | `{ error: "Message and session ID are required." }` | Missing body fields |
| 504 | `{ error: "The AI took too long to respond. Please try again." }` | Azure timeout (>60s) |
| 500 | `{ error: "Something went wrong. Please try again." }` | Azure or DB error |

### `GET /api/messages?sessionId={id}`
Returns messages in `created_at ASC` order.
```json
[{ "id": "...", "role": "user", "content": "...", "created_at": "..." }]
```

### `POST /api/messages`
Auto-save a message before the AI call.
**Body:** `{ sessionId, role, content }`
**Returns:** `Message` object.

---

## Azure AI Turn (server-side, `/api/chat`)

1. Read `azure_token` from HTTP-only cookie → 401 if missing
2. Parse `{ contractText, userMessage, sessionId }` from body
3. Save user message: `createMessage(sessionId, 'user', userMessage)`
4. Create Azure thread: `POST {ENDPOINT}/threads?api-version=2025-05-01`
5. Add message with system context:
   - System prompt: "You are an AI assistant. Answer questions based solely on the document text provided. Always cite the specific section or part you are referencing. If the answer cannot be found in the provided text, say: 'I cannot find this in the document.' Do not speculate beyond what the document contains."
   - User content: `[Document text]\n\n${contractText}\n\n[Question]\n${userMessage}`
6. Run thread: `POST .../threads/{threadId}/runs` with `AZURE_AGENT_ID`
7. Poll status every 1.5s — timeout after 60s
8. Retrieve assistant message from thread
9. Save assistant message: `createMessage(sessionId, 'assistant', responseText)`
10. Update session: `updateSession(sessionId, { status: 'completed', updated_at: now })`
11. Auto-title if needed: `PATCH /api/sessions/[id]` with truncated first message
12. Return `{ message: responseText, sessionId, title }`

---

## Components

| Component | File | Responsibility | Key props |
|---|---|---|---|
| Chat page | `app/chat/page.tsx` | All state, auth guard, layout shell | — |
| ChatArea | `components/ChatArea.tsx` | Scrollable message list + composer | `messages`, `isLoading`, `onSend`, `onFileLoaded` |
| MessageList | `components/MessageList.tsx` | Renders all MessageBubble items | `messages`, `isLoading` |
| MessageBubble | `components/MessageBubble.tsx` | Single message + timestamp + feedback | `message`, `onFeedbackSubmit` |
| FileUpload | `components/FileUpload.tsx` | File picker, parsing, chip — no state | `onFileLoaded`, `filename` |
| FeedbackForm | `components/FeedbackForm.tsx` | Stars + comment below assistant bubbles | `sessionId`, `userId`, `onSubmit` |
| RightPanel | `components/RightPanel.tsx` | Execution steps + document preview | `executionStep`, `previewUrl`, `filename`, `fileType`, `contractText` |

---

## Optimistic Updates

1. User hits Send
2. Append `{ id: 'optimistic-{timestamp}', role: 'user', content, created_at: now }` to `messages[]` immediately
3. API call fires
4. On success: replace optimistic message with server-returned message (swap by matching content + role, or use returned id)
5. On failure: remove optimistic message, show inline error "Failed to send. Try again."

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Send without attaching a file | Allowed — `contractText` is empty string; Azure responds based on question alone |
| Send with empty/whitespace message | Send button disabled — no request fired |
| Azure returns 401 (token expired) | Show "Session expired. Reconnect your Azure account." with link to `/api/auth/microsoft` |
| Azure times out (>60s) | Show "The AI took too long. Please try again." — roll back optimistic message |
| User switches sessions mid-request | Cancel in-flight request; clear messages immediately before loading new session |
| Very long AI response | Rendered in full — no truncation; chat scrolls |
| Session with no messages selected | Show empty state: "Upload a document and ask your first question." |
| No `?session` param on load | Show empty state in chat area; user must click "New chat" |
