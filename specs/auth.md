# Auth Spec — Signup and Login

## Feature Name
Signup and Login (custom email/password authentication)

---

## Description

Users authenticate with email and password. No Supabase Auth — a custom `users` table stores
credentials. Passwords are hashed with bcryptjs (10 rounds) server-side. On success, `userId`
and `userEmail` are stored in `localStorage`. Auth pages use light mode (`data-theme="light"`).
Dashboard and chat are protected — users without a `userId` in localStorage are immediately
redirected to `/login`.

---

## User Flow — Signup

1. User visits `/signup`
2. Fills in: **Email**, **Password** (≥ 8 chars), **Confirm password**
3. Client validates:
   - Email format (regex)
   - Password ≥ 8 characters
   - Passwords match
4. On submit: `POST /api/auth/signup` with `{ email, password }`
5. Server checks `users` table for existing email → returns `409` if found
6. Server hashes password: `bcryptjs.hash(password, 10)`
7. Server inserts row into `users` table
8. Returns `{ userId, email }`
9. Client stores `userId` and `userEmail` in `localStorage`
10. Client redirects to `/dashboard`

---

## User Flow — Login

1. User visits `/login`
2. Fills in: **Email**, **Password**
3. Client validates: both fields non-empty
4. On submit: `POST /api/auth/login` with `{ email, password }`
5. Server queries `users` table by email
6. `bcryptjs.compare(password, hash)` — if user not found or hash mismatch: return `401`
7. Returns `{ userId, email }` on success
8. Client stores `userId` and `userEmail` in `localStorage`
9. Client redirects to `/dashboard`

---

## DB Schema

**Table: `users`**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| email | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |

Index: `users_email_idx ON users(email)`

---

## API Routes

### `POST /api/auth/signup`
**Request body:** `{ email: string, password: string }`

| Status | Response body | Condition |
|---|---|---|
| 201 | `{ userId, email }` | Success |
| 409 | `{ error: "An account with this email already exists." }` | Duplicate email |
| 400 | `{ error: "Email and password are required." }` | Missing fields |
| 500 | `{ error: "Something went wrong. Please try again." }` | DB error |

### `POST /api/auth/login`
**Request body:** `{ email: string, password: string }`

| Status | Response body | Condition |
|---|---|---|
| 200 | `{ userId, email }` | Success |
| 401 | `{ error: "Incorrect email or password." }` | No user or wrong password |
| 400 | `{ error: "Email and password are required." }` | Missing fields |
| 500 | `{ error: "Something went wrong. Please try again." }` | DB error |

Error messages are generic — never reveal whether the email exists.

---

## Components

**`/app/login/page.tsx`**
- Route: `/login`
- Standalone centered card, `data-theme="light"` on `<html>`
- Contains: heading "Welcome back", email input, password input, submit button, link to `/signup`
- Error message shown inline below the form

**`/app/signup/page.tsx`**
- Route: `/signup`
- Standalone centered card, `data-theme="light"` on `<html>`
- Contains: heading "Create an account", email input, password input, confirm password input, submit button, link to `/login`
- Error message shown inline below the form

---

## Auth Guard

- Runs `useEffect` on mount in every protected page (`/dashboard`, `/chat`)
- Reads `localStorage.getItem('userId')`
- If absent or empty: `router.replace('/login')` immediately
- No flash of protected content — show nothing until guard passes (conditional render)

---

## Logout

- Clears `localStorage.removeItem('userId')` and `localStorage.removeItem('userEmail')`
- Calls `router.replace('/login')`
- Triggered from the user footer in the Sidebar component

---

## Important Implementation Notes

- `localStorage` keys: `'userId'` (UUID string) and `'userEmail'` (email string)
- Use `bcryptjs` (not `bcrypt`) — bcryptjs works in Next.js API routes without native bindings
- Hash happens **server-side only** — never send a plaintext password from client to DB
- `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) is used in API routes to bypass RLS
- On signup, check email existence before hashing (saves CPU on duplicates)

---

## Design

- **Page background:** `--an-bg-base` light (`#FAF9F7`)
- **Card:** centered, max-width 400px, `bg-an-bg-subtle`, border `1px an-border-base`, border-radius 12px, padding 32px
- **Heading:** `text-display` (28px/500), `font-display` (Lora), color `an-fg-base`
- **Inputs:** height 36px, `bg-an-bg-surface`, border `1px an-border-base`, focus `an-border-strong`
- **Submit button:** primary style — `bg-an-accent`, white text, height 36px, full width, border-radius 6px
- **Error message:** `text-an-error`, 13px, shown below the form
- **Link:** `text-an-accent`, no underline, hover underline

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Email already registered (signup) | Server returns 409; client shows "An account with this email already exists." |
| Wrong password (login) | Server returns 401; client shows "Incorrect email or password." — no field enumeration |
| Email not found (login) | Same 401 response and message as wrong password |
| Password < 8 chars (signup) | Client-side error before submit: "Password must be at least 8 characters." |
| Passwords don't match (signup) | Client-side error: "Passwords do not match." |
| Empty form submission | Client-side error: "Please fill in all fields." |
| Already logged in visits /login or /signup | Redirect to `/dashboard` |
| Network error on submit | Show "Something went wrong. Please try again." |
