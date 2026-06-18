# Sessions Spec — Sidebar Session Management

## Feature Name
Session Management — Sidebar list, search, filter, pin, rename, delete

---

## Description

The sidebar is the left panel (256px fixed) present on both `/dashboard` and `/chat`. It shows
the user's chat history as a scrollable list, allows searching and filtering, and exposes
per-session actions (pin, rename, delete) via a context menu. Sessions are sorted pinned-first,
then by `updated_at DESC`. All mutations go through PATCH/DELETE API routes and update local
state optimistically.

---

## Layout (Sidebar — top to bottom)

```
┌──────────────────────────┐
│  Logo + "Contract AI"    │  24px padding, height ~56px
│  ─────────────────────── │
│  [ + New chat ]          │  Full-width primary button, 36px height
│  ─────────────────────── │
│  [ Search sessions... ]  │  Input, 36px height, magnifier icon left
│  ─────────────────────── │
│  All  Pinned  Recent     │  Filter tabs (horizontal scroll if needed)
│  Processing  Completed   │
│  Error                   │
│  ─────────────────────── │
│  Session list (scroll)   │  flex-1, overflow-y auto
│  ─────────────────────── │
│  [Avatar] email  Logout  │  Pinned to bottom, 16px padding
└──────────────────────────┘
```

Width: 256px, background: `an-bg-subtle`

---

## State Architecture

`Sidebar.tsx` receives all data as props from the parent page (`app/chat/page.tsx` or
`app/dashboard/page.tsx`). It owns no data-fetching state.

**Props:**
```typescript
{
  sessions: Session[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
  onPinSession: (id: string, pinned: boolean) => void
  onDeleteSession: (id: string) => void
  userEmail: string
  onLogout: () => void
}
```

**Local state (owned by Sidebar):**
- `searchQuery: string` — client-side filter
- `activeFilter: FilterTab` — active tab
- `contextMenuSessionId: string | null` — which session has menu open
- `renamingSessionId: string | null` — which session is in inline edit mode

---

## Session List Item

**Height:** 36px, **padding:** 0 12px, **border-radius:** 6px
**States:** default (transparent bg), hover (`bg-an-bg-surface`), active (`bg-an-bg-elevated`)
**Layout:** status dot (left, 6px), title (13px, truncated 1 line, flex-1), date (12px, `an-fg-muted`, right)

**Status dots:**
| Status | Color |
|---|---|
| idle | `an-fg-muted` (grey) |
| processing | `an-warning` (amber), pulsing |
| completed | `an-success` (green) |
| error | `an-error` (red) |

**Pinned indicator:** small coral dot top-right of the item row (6px, `an-accent`).

**Sort order:** pinned sessions (pinned=true) floated to top of list, then all others by `updated_at DESC`.

---

## Search

- `<input placeholder="Search sessions...">` with `<Search size={14} />` icon left-padded
- Client-side filter: compares `session.title.toLowerCase()` against `searchQuery.toLowerCase()`
- Composes with active filter tab (both applied simultaneously)
- Zero results: show "No sessions match your search." in muted text
- Clears on "New chat" click

---

## Filter Tabs

| Tab | Logic |
|---|---|
| All | No filter — all sessions |
| Pinned | `session.pinned === true` |
| Recent | `session.updated_at` within last 7 days |
| Processing | `session.status === 'processing'` |
| Completed | `session.status === 'completed'` |
| Error | `session.status === 'error'` |

- Default: **All**
- Active tab: `text-an-fg-base`, underline or accent dot indicator; inactive: `text-an-fg-subtle`
- Font: 12px/500

---

## Context Menu (`SessionContextMenu.tsx`)

Triggered by hovering a session item — a `...` (MoreHorizontal) icon appears right-side.
Clicking it opens a small dropdown.

| Action | Icon | API call | Local state effect |
|---|---|---|---|
| Pin / Unpin | `Pin` / `PinOff` | `PATCH /api/sessions/[id]` `{ pinned }` | Toggle `pinned` in `sessions[]` optimistically |
| Rename | `Pencil` | — (inline edit mode) | Set `renamingSessionId` |
| Delete | `Trash2` | `DELETE /api/sessions/[id]` | Show confirmation dialog first |

**Rename flow:**
1. Session title becomes an `<input>` with current title pre-filled
2. Confirm: `Enter` key → `PATCH /api/sessions/[id]` `{ title }` → update local state
3. Cancel: `Escape` or blur → revert to original title
4. Empty rename: block — do not send request if input is blank

**Delete flow:**
1. Show confirmation dialog: "Delete this chat? This cannot be undone."
2. Two buttons: "Cancel" (ghost) and "Delete" (danger — `bg-an-error` tinted, `text-an-error`)
3. On confirm: `DELETE /api/sessions/[id]` → remove from local `sessions[]`
4. If deleted session was active: clear active session, navigate to `/dashboard`

**Menu close:** outside click, `Escape`, or action taken.

---

## User Footer

- **Left:** initials avatar (20px circle, `bg-an-accent-subtle`, `text-an-accent`, 11px/500) + email (`text-an-fg-subtle`, 12px, truncated)
- **Right:** `LogOut` icon (16px), ghost button, triggers logout
- **Logout:** `localStorage.removeItem('userId')`, `localStorage.removeItem('userEmail')`, `router.replace('/login')`

---

## API Routes

### `GET /api/sessions?userId={id}`
Returns all sessions for user, sorted pinned-first then `updated_at DESC`.
```json
[{ "id": "...", "title": "...", "status": "completed", "pinned": false, "updated_at": "..." }]
```

### `POST /api/sessions`
**Body:** `{ userId, title? }`
Creates new session with default title `'New session'`.
**Returns:** full `Session` object.

### `PATCH /api/sessions/[id]`
**Body:** one or more of `{ title?, pinned?, status? }`
**Returns:** updated `Session` object.
**Auth:** validates that the session belongs to the requesting userId.

### `DELETE /api/sessions/[id]`
Deletes session. Cascade deletes all messages and feedback via DB foreign keys.
**Returns:** `{ success: true }`
**Auth:** validates ownership before deleting.

---

## New Chat Flow

1. User clicks "New chat" button in sidebar
2. `onNewChat()` callback fires in parent
3. Parent calls `POST /api/sessions` to create new session
4. Parent sets `activeSessionId` to new session id
5. Parent navigates to `/chat` (if not already there)
6. Sidebar highlights the new session
7. Chat area is cleared (no messages)

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Search + filter returns 0 results | "No sessions match your search." (muted, centered in list area) |
| Session list empty (new user) | "No chats yet — start a new chat above." with arrow pointing to New Chat button |
| Delete active session | Clear chat area, set `activeSessionId = null`, navigate to `/dashboard` |
| Rename to blank string | Block submit; keep inline edit open with error border |
| Context menu open + user scrolls | Menu closes on scroll |
| Pin limit | No limit in MVP |
| More than ~50 sessions | Sidebar scrolls; no pagination in MVP — all sessions loaded at once |
