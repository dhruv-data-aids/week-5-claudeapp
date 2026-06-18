# Feedback Spec — Rating and Comment Widget

## Feature Name
Feedback — Post-response rating widget

---

## Description

After every assistant message, a feedback widget appears inline below the message bubble.
The user rates the response 1–5 stars and optionally adds a short comment. On submit, the
rating and comment are saved to the `feedback` table in Supabase. The widget is then replaced
by a small confirmation chip. Feedback is user-specific and session-scoped.

---

## User Flow

1. Assistant message arrives and is rendered in the chat
2. `FeedbackForm` renders immediately below the assistant bubble (not after a delay)
3. User hovers stars — they highlight progressively (1 → 5 filled)
4. User clicks a star — that rating is selected (stars 1 through selected are filled)
5. Optional: user types a comment in the textarea that appears after a rating is selected
6. User clicks "Submit feedback"
7. `POST /api/feedback` is called with `{ userId, sessionId, rating, comment }`
8. On success: form is replaced with a small chip — "Thanks for your feedback"
9. On failure: inline error "Could not save feedback. Try again." — form stays visible

---

## Component — `FeedbackForm.tsx`

**Props:**
```typescript
{
  sessionId: string
  userId: string
  onSubmit: () => void
}
```

**Local state:**
- `selectedRating: number | null` — 0 = none selected, 1–5 = filled stars
- `hoverRating: number` — for hover highlight effect
- `comment: string` — optional text
- `isSubmitting: boolean`
- `isSubmitted: boolean` — when true, render "Thanks" chip instead
- `error: string | null`

**Layout:**
```
[★ ★ ★ ★ ★]   ← 5 star buttons, 16px, stroke-1.5
[Optional: textarea for comment]   ← appears after rating selected
[Submit feedback]                  ← primary button, 36px, appears after rating selected
```

- Stars: `Star` icon from Lucide, 16px, stroke 1.5px
- Unselected / unhovered: `text-an-fg-muted`
- Hovered (1 through hovered): `text-an-warning` (amber), filled
- Selected (1 through selected): `text-an-accent` (coral), filled
- Textarea: same input style (height 72px, `bg-an-bg-surface`, 13px, `resize-none`)
- Submit button: primary style, 36px height, label "Submit feedback"
- Placement: left-aligned, directly below assistant bubble, 8px gap

**Submitted state:**
```
✓ Thanks for your feedback
```
- `CheckCircle` icon (14px, `text-an-success`) + "Thanks for your feedback" (12px, `text-an-fg-muted`)
- Replaces the form — not dismissable

---

## API Route

### `POST /api/feedback`

**Auth:** `userId` passed in request body (validated server-side)

**Request body:**
```json
{
  "userId": "uuid",
  "sessionId": "uuid",
  "rating": 4,
  "comment": "Very accurate citation."
}
```

**Responses:**

| Status | Body | Condition |
|---|---|---|
| 201 | `{ id, rating, created_at }` | Saved successfully |
| 400 | `{ error: "Rating is required and must be 1–5." }` | Missing or out-of-range rating |
| 400 | `{ error: "userId and sessionId are required." }` | Missing IDs |
| 500 | `{ error: "Could not save feedback. Please try again." }` | DB error |

**Server-side:** calls `createFeedback(userId, sessionId, rating, comment)` from `lib/db.ts`.

---

## DB Schema

**Table: `feedback`**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| user_id | UUID | NOT NULL, FK → users.id ON DELETE CASCADE |
| session_id | UUID | NOT NULL, FK → sessions.id ON DELETE CASCADE |
| rating | INTEGER | NOT NULL, CHECK BETWEEN 1 AND 5 |
| comment | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |

---

## Design

- **Form container:** no background, no border — inline below assistant bubble, 8px top margin
- **Star row:** `flex gap-1`, stars 16px, pointer cursor
- **Comment textarea:** appears with a 150ms fade-in after rating is selected
- **Submit button:** primary style (`bg-an-accent`), width auto (not full-width)
- **Error message:** `text-an-error`, 12px, shown below submit button
- **Submitted chip:** `flex items-center gap-1`, `text-an-fg-muted`, 12px, no background

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| User tries to submit without a rating | Submit button is disabled until a star is clicked |
| User submits with rating only (no comment) | `comment` sent as `null` — valid, saved successfully |
| Comment longer than 500 chars | Textarea `maxLength={500}`; character counter shown at 400+ |
| Submit fails (network error) | Show inline error; form stays open; user can retry |
| User submits feedback twice | Submit button disabled after first successful submit; form replaced by chip |
| Session deleted before feedback submitted | API returns 400 (FK constraint); show "Session no longer exists." |
| Multiple assistant messages | Each assistant bubble gets its own independent `FeedbackForm` instance |
