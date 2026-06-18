# Dashboard Spec — Home Screen

## Feature Name
Dashboard — Post-login home screen with KPI cards and recent sessions

---

## Description

The dashboard is the landing page after login. It shows an overview of the user's activity
via a KPI card grid and a recent sessions list. It uses the same three-panel shell as the
chat page (sidebar + center + right panel stub). The center panel shows the KPI grid and
recent sessions — not the chat interface. A "New chat" button in the top-right navigates
to `/chat` and creates a new session.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar 256px       │  Dashboard center flex-1  │  — (none) │
│  bg-an-bg-subtle     │  bg-an-bg-base            │           │
│  (session list,      │  KPI grid (3-col)         │           │
│   new chat, user)    │  Recent sessions          │           │
└──────────────────────────────────────────────────────────────┘
```

The right panel is not shown on the dashboard — it appears only in the chat view.

When the user clicks "New chat" or selects a session from the sidebar, they navigate to
`/chat` (with the session pre-loaded).

---

## State Architecture

`/app/dashboard/page.tsx` owns:

| State | Type | Used by |
|---|---|---|
| `userId` | `string` | All API calls (read from localStorage on mount) |
| `kpis` | `KPIData \| null` | KPI card grid |
| `sessions` | `Session[]` | Sidebar + recent sessions section |
| `isLoadingKpis` | `boolean` | KPI skeleton state |
| `isLoadingSessions` | `boolean` | Session list skeleton state |
| `kpiError` | `string \| null` | KPI error state |

On mount:
1. Auth guard — redirect to `/login` if no `userId` in localStorage
2. Fetch KPIs and sessions in parallel

---

## KPI Cards

Displayed in a 3-column responsive grid (`grid-cols-3` → `grid-cols-2` at md → `grid-cols-1` at sm).

### All 13 KPIs (from PRD §3.3)

| # | Label | Description | Source |
|---|---|---|---|
| 1 | Total sessions | All-time count of chat sessions | `COUNT(*) FROM sessions WHERE user_id` |
| 2 | Sessions this week | Sessions started in last 7 days | `sessions WHERE created_at > now()-7d` |
| 3 | Total AI queries | All-time user-role message count | `messages WHERE role='user' + session join` |
| 4 | AI queries this week | User messages in last 7 days | same + `created_at > now()-7d` |
| 5 | Active sessions (7d) | Sessions with messages in last 7 days | `DISTINCT session_id FROM messages` |
| 6 | Pinned chats | Count of pinned sessions | `sessions WHERE pinned=true` |
| 7 | Documents uploaded | Count of sessions with a file attached | Derived: same as total sessions (1 doc per session in MVP) |
| 8 | Avg processing time | Avg ms from message send → response | Placeholder `--` in MVP (no timing column yet) |
| 9 | Total reports generated | Exported sessions | `0` in MVP (v1.1 feature) |
| 10 | Total clauses extracted | AI-identified key passages | `0` in MVP (v1.1 feature) |
| 11 | AI accuracy | Average feedback rating (1–5) | `AVG(rating) FROM feedback WHERE user_id` |
| 12 | Failed jobs | Sessions with status='error' | `sessions WHERE status='error'` |
| 13 | Storage used | Total file size uploaded | `--` in MVP (files not persisted) |

### KPI Card Design

- **Card container:** `bg-an-bg-surface`, border `1px an-border-base`, border-radius 8px, padding 16px
- **Label:** 12px/500, `text-an-fg-subtle`, uppercase, letter-spacing 0.05em
- **Value:** 28px/500, `text-an-fg-base`, `font-display` (Lora)
- **Sub-label:** 12px, `text-an-fg-muted` (e.g. "this week", "all time")
- **Loading state:** skeleton placeholder matching the value's dimensions
- **Error state:** show `--` and sub-label "unavailable"

---

## Recent Sessions Section

Below the KPI grid. Shows the last 5 sessions as quick-access cards.

**Each card:**
- Title (truncated 1 line), date, status badge (pill: idle / processing / completed / error)
- "Open" button → navigates to `/chat?session={id}`
- Background: `bg-an-bg-surface`, border `1px an-border-base`, border-radius 8px

**Empty state:** "No sessions yet — start a new chat to get going." with "New chat" button.

---

## Sidebar (shared with chat)

See [sessions.md](sessions.md) for the full Sidebar spec.

On the dashboard:
- Active session is `null` (no highlight)
- Clicking a session navigates to `/chat?session={id}`
- "New chat" button navigates to `/chat` (no `?session` param — creates new session on load)

---

## Dashboard Actions

- **"New chat" button** — top-right of center panel, primary style (coral accent), navigates to `/chat`
- **Session card "Open" button** — navigates to `/chat?session={id}`
- **Sidebar session click** — same as above

---

## API Routes Used

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard/kpis?userId=` | Fetch all 13 KPI values |
| GET | `/api/sessions?userId=` | Fetch session list for sidebar + recent |

### `GET /api/dashboard/kpis?userId={id}`
Runs all KPI queries in parallel, returns:
```json
{
  "totalSessions": 12,
  "sessionsThisWeek": 3,
  "totalMessages": 47,
  "messagesThisWeek": 8,
  "activeSessions": 4,
  "pinnedSessions": 2,
  "avgRating": 4.2,
  "failedSessions": 1
}
```
Metrics with no data return `null` (rendered as `--`).

---

## Components

| Component | File | Responsibility |
|---|---|---|
| Dashboard page | `app/dashboard/page.tsx` | Auth guard, data fetch, layout |
| KPIGrid | `components/KPIGrid.tsx` | Renders 3-col grid of KPICard components |
| KPICard | `components/KPICard.tsx` | Single metric card with label, value, sub-label |
| RecentSessions | `components/RecentSessions.tsx` | Last 5 sessions as quick-access cards |
| Sidebar | `components/Sidebar.tsx` | Shared with chat view — see sessions.md |

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| User not logged in | Auth guard redirects to `/login` before any data fetch |
| KPI API fails | Show `--` in all cards; no blocking error — app remains usable |
| Sessions API fails | Show "Could not load sessions" with retry button in sidebar |
| No sessions yet | KPIs show zeros; recent sessions section shows empty state |
| KPI value is null (v1.1 feature) | Show `--` with muted sub-label "coming in v1.1" |
| Very large numbers (>10k) | Format with locale string: `10,234` not `10234` |
