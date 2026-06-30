# Nugmail — Full App Breakdown

## What It Is

Nugmail is a mobile-first Progressive Web App (PWA) that acts as a custom Gmail client. It replaces the standard Gmail interface with a sleeker, touch-optimized UI that adds personal productivity features on top of your real Gmail inbox: a pinning system, a "Hott" urgent list, a personal goal tracker, and AI-powered email relevance scoring tied to your goals.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend framework | React 19 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v7 |
| Server state | TanStack React Query v5 |
| Client state | React Context API |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Auth | Google OAuth2 (`@react-oauth/google`) |
| Email data | Gmail REST API (called directly from the browser with the user's access token) |
| Persistence | Firebase Firestore (pinned items, hott list, goals) |
| Firebase Auth | Anonymous sign-in used to gate Firestore access |
| Push notifications | Web Push API + VAPID + `web-push` npm library |
| AI | OpenAI API (`gpt-5.4-mini`) via serverless functions |
| HTML sanitization | DOMPurify |
| Deployment | Vercel (SPA rewrites + serverless API functions + cron) |

---

## Project Structure

```
nugmail/
├── src/
│   ├── App.tsx                    # Root: providers, routing, QueryClient
│   ├── main.tsx                   # Entry point, service worker registration
│   ├── components/
│   │   ├── LoginPage.tsx          # Google sign-in screen
│   │   ├── MainLayout.tsx         # Shell: header + sidebar + bottom nav + routes
│   │   ├── Header.tsx             # Search bar, account avatar dropdown
│   │   ├── Sidebar.tsx            # Desktop nav + compose button
│   │   ├── BottomNav.tsx          # Mobile tab bar + compose FAB
│   │   ├── EmailList.tsx          # Email list with pinned section, pull-to-refresh, quotes
│   │   ├── EmailItem.tsx          # Single email row with touch gestures + context menu
│   │   ├── EmailDetail.tsx        # Full email view with goal relevance bar
│   │   ├── ComposeModal.tsx       # New/reply/forward email modal
│   │   ├── HottPage.tsx           # Urgent/hot items dashboard
│   │   ├── GoalsPage.tsx          # Personal goal tracker
│   │   ├── SenderAvatar.tsx       # Avatar component (Gravatar fallback → colored initials)
│   │   └── AuthSessionKeeper.tsx  # Proactively refreshes tokens before expiry
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Multi-account state, token storage (localStorage)
│   │   ├── PinnedContext.tsx      # Pinned items (emails, quotes, notes) synced to Firestore
│   │   ├── HottContext.tsx        # Hott items (emails, notes) synced to Firestore
│   │   └── GoalsContext.tsx       # Goals synced to Firestore
│   ├── hooks/
│   │   ├── useEmailList.ts        # Infinite-scroll email list across all accounts
│   │   ├── useEmailDetail.ts      # Single email fetch + email actions (star/archive/trash/read)
│   │   ├── useGoogleAuth.ts       # Login flow + token refresh
│   │   ├── useGoalRelevance.ts    # AI goal relevance scoring per email (cached in localStorage)
│   │   ├── useGoalLabels.ts       # Short AI-generated labels for each goal
│   │   ├── useInboxNotifications.ts # In-app polling for new mail to trigger push
│   │   ├── usePushNotifications.ts  # Web Push setup, enable/disable, sound toggle
│   │   ├── useSendEmail.ts        # Send email mutation
│   │   └── useQuotes.ts           # Fetches 150 inspirational quotes from dummyjson.com
│   ├── services/
│   │   └── gmail.ts               # Typed wrapper for Gmail REST API
│   ├── utils/
│   │   ├── emailParser.ts         # Parses raw GmailMessage → ParsedEmail
│   │   ├── emailBuilder.ts        # Builds RFC 2822 raw email string for send
│   │   └── formatters.ts          # Date formatting, avatar color, initials
│   ├── types/
│   │   └── gmail.ts               # TypeScript interfaces for Gmail API + ParsedEmail
│   └── lib/
│       └── firebase.ts            # Firebase app, auth, and Firestore instances
├── api/                           # Vercel serverless functions
│   ├── exchange-token.js          # OAuth code → access/refresh tokens
│   ├── refresh-token.js           # Uses refresh token to get new access token
│   ├── register-push.js           # Saves push subscription to Firestore
│   ├── send-push.js               # Sends a single push notification
│   ├── poll-new-mail.js           # Cron job: checks all users for new mail, sends push
│   ├── analyze-goals.js           # AI: scores email relevance to each goal (0-100)
│   ├── summarize-goals.js         # AI: generates short label strings for goals
│   └── _firebase-admin.js         # Shared Firebase Admin SDK init (server-side)
└── vercel.json                    # SPA rewrite + cron schedule (poll-new-mail: every minute)
```

---

## Routes

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Google sign-in; redirects to `/inbox` if already authenticated |
| `/inbox` | `EmailList` | Gmail INBOX label |
| `/starred` | `EmailList` | Gmail STARRED label |
| `/sent` | `EmailList` | Gmail SENT label |
| `/drafts` | `EmailList` | Gmail DRAFT label |
| `/spam` | `EmailList` | Gmail SPAM label |
| `/trash` | `EmailList` | Gmail TRASH label |
| `/search?q=...` | `EmailList` | Full-text search across all accounts |
| `/email/:messageId?acc=...` | `EmailDetail` | Full email view |
| `/hott` | `HottPage` | Personal hot/urgent items list |
| `/goals` | `GoalsPage` | Personal goal tracker |

---

## Core Features

### Authentication & Multi-Account

- Sign in with Google via OAuth2 authorization code flow.
- The auth code is sent to `/api/exchange-token` (server-side) which exchanges it for an access token + refresh token using the Google client secret, then returns the access token + user profile to the client.
- Multiple Google accounts can be signed in simultaneously. Each account has its own access token stored in localStorage under `nugmail_accounts_v1`.
- Token expiry is tracked client-side. `AuthSessionKeeper` proactively refreshes tokens 60 seconds before they expire.
- The email list merges emails from all signed-in accounts into a single chronological feed. A colored dot on the sender avatar indicates which account an email belongs to when multiple accounts are active.
- Signing in a second account appends it; accounts can be individually removed from the header dropdown.

### Email List

- Fetches 25 emails per page using the Gmail REST API; infinite-scroll loads more automatically using an IntersectionObserver sentinel at the bottom.
- Emails from all signed-in accounts are fetched in parallel, merged, and sorted newest-first.
- Auto-refreshes every 30 seconds.
- Manual refresh via the refresh button or pull-to-refresh (mobile).
- Pull-to-refresh shows a circular progress ring and a random inspirational quote while refreshing; haptic feedback fires when the threshold is reached.
- Inspirational quotes are also injected as visual dividers between every 10 emails in the list.
- Scroll position is saved to sessionStorage when navigating to an email and restored when going back.

### Email Item Touch Interactions

| Gesture | Action |
|---|---|
| Tap | Open email (marks as read) |
| Double-tap | Open long-press context menu |
| Long-press (500ms) | Open long-press context menu |
| Swipe left or right ≥80px | Archive with slide-off + collapse animation |
| Pin button | Pin/unpin to Pinned section |
| Star button | Toggle Gmail star |

### Long-Press Context Menu

A bottom sheet modal with:
- **Add to Hott / Remove from Hott** — adds/removes the email from the Hott list
- Reply, Forward, Mark as unread, Archive, Move to, Label as, Block sender
- "Get your game on!" and "I am cool" (decorative/fun items)

### Pinned Section

Displayed at the top of every email list view. Persists to Firestore.

Three types of pinnable items:
- **Emails** — pinned from the pin button on any email row
- **Inspirational quotes** — pinned from the pin button on quote dividers
- **Notes** — created directly in the Pinned section with a text field and optional due date/time

All pinned items are **drag-and-drop reorderable** (using @dnd-kit). The scroll position compensates when the section resizes so the visible emails below don't jump.

Long-pressing a pinned note opens a context menu with "Add to Hott" and "Unpin" options.

### Email Detail

- Renders HTML email bodies in a sandboxed `<iframe>` (DOMPurify sanitized). Falls back to plain text.
- Shows sender avatar, full date, To/CC headers, and which account it was received on.
- Toolbar: star, archive, trash, forward (via "..." menu).
- **Goal Relevance Bar** — at the top of the detail toolbar, a row of colored mini progress bars shows how relevant this email is to each of your active goals (0–100% score per goal, powered by OpenAI). Results are cached in localStorage by email ID + goal hash so each email/goal combination is only scored once.
- Reply/Reply All/Forward bar fixed at the bottom, opens the Compose modal.

### Compose

- Bottom sheet on mobile, floating window (Gmail-style) on desktop.
- Minimizable to a tray strip.
- If multiple accounts are signed in, shows a "From" account selector dropdown.
- Fields: To, Subject, Body.
- Supports composing new emails, replies (pre-fills To + subject with "Re:"), and forwards.

### Hott

A personal urgent/important watchlist. Items are stored in Firestore and appear on the `/hott` route (also accessible from the mobile bottom nav).

- Add emails via long-press context menu → "Add to Hott"
- Add pinned notes via long-press → "Add to Hott"
- Items show with sender avatar (emails) or note icon (notes), subject/text, and date/due date
- Clicking a Hott email navigates to its EmailDetail view
- Remove items with the flame button on each row

### Goals

A simple personal to-do/goal tracker at `/goals`. Goals are stored in Firestore.

- Add goal by typing in the input and pressing the + button
- Toggle complete (checkmark button) — completed goals move to a "Completed" section with strikethrough text
- Delete goal (trash button)
- Active goals drive the AI relevance bar shown in EmailDetail — each active goal gets a score column

### Push Notifications

- Enable/disable from the account dropdown in the header.
- Sound can be toggled separately (on/off).
- Uses the Web Push API with VAPID keys. The push subscription endpoint is registered with the server via `/api/register-push` (stored in Firestore alongside the user's refresh token).
- **Background polling**: `/api/poll-new-mail` runs as a Vercel cron job every minute. It iterates all registered users, refreshes their access tokens if needed, fetches their latest inbox, detects new message IDs not seen in the previous run, and sends push notifications (up to 3 per user per tick) with the email subject and sender.
- **In-app notifications**: While the app is open, `useInboxNotifications` polls and calls `usePushNotifications.notify()` which plays a beep sound (WebAudio API oscillator) and sends a push via `/api/send-push`.
- A service worker handles incoming push events and displays browser notifications.

---

## Data Models

### ParsedEmail
```ts
{
  id, threadId, labelIds, snippet,
  internalDate,   // Unix ms timestamp
  from, fromName, fromEmail,
  to, cc, replyTo,
  subject,
  bodyHtml?,      // Raw HTML
  bodyText?,
  hasAttachments,
  isUnread, isStarred, isImportant,
  accountEmail    // Which signed-in account owns this
}
```

### Account (localStorage)
```ts
{ accessToken, tokenExpiry, user: { email, name, picture } }
```

### PinnedItem (Firestore: `users/{email}/pinned/{type_id}`)
```ts
// Email
{ type: 'email', id, data: ParsedEmail, pinnedAt }
// Quote
{ type: 'quote', id, data: { quote, author }, pinnedAt }
// Note
{ type: 'note', id, data: { text, dueAt? }, pinnedAt }
```

### HottItem (Firestore: `users/{email}/hott/{type_id}`)
```ts
{ type: 'email', id, data: ParsedEmail, addedAt }
{ type: 'note',  id, data: { text, dueAt? }, addedAt }
```

### Goal (Firestore: `users/{email}/goals/{id}`)
```ts
{ id, text, completed, createdAt, completedAt? }
```

### Push Registration (Firestore: `push-registrations/{email}`)
```ts
{
  email, subscription,         // Web Push subscription object
  refresh_token, access_token, access_token_expiry,
  last_seen_ids,               // Array of Gmail message IDs from last poll
  sound                        // boolean
}
```

---

## API Endpoints (Vercel Serverless)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/exchange-token` | POST | Takes a Google OAuth auth code, exchanges it server-side for access + refresh tokens, stores refresh token in Firestore, returns access token + user profile |
| `/api/refresh-token` | POST | Uses a stored refresh token to get a new access token |
| `/api/register-push` | POST | Saves/updates a Web Push subscription and sound preference to Firestore |
| `/api/send-push` | POST | Sends a single push notification to a given subscription endpoint |
| `/api/poll-new-mail` | GET | Cron job (runs every minute via Vercel cron). Checks all registered users for new inbox messages and fires push notifications. Authorized via `CRON_SECRET` header |
| `/api/analyze-goals` | POST | Sends email content + goal list to OpenAI, returns relevance scores (0–100 per goal) as structured JSON |
| `/api/summarize-goals` | POST | Sends goal texts to OpenAI, returns short display labels for each goal |

---

## State Management

| Data | Where stored |
|---|---|
| Account tokens + user profiles | `localStorage` (`nugmail_accounts_v1`) |
| Email lists | TanStack React Query cache (in-memory, auto-refetch every 30s) |
| Email detail | TanStack React Query cache |
| Pinned items | Firebase Firestore (real-time `onSnapshot`) + React Context |
| Hott items | Firebase Firestore (real-time `onSnapshot`) + React Context |
| Goals | Firebase Firestore (real-time `onSnapshot`) + React Context |
| Goal relevance scores | `localStorage` (per email+goal hash, 24h stale time in RQ) |
| Push notification prefs | `localStorage` (`nugmail_notif_prefs`) |
| Scroll positions | `sessionStorage` (per pathname, cleared on restore) |
| Quotes | TanStack React Query (infinite stale time, fetched once from dummyjson.com) |

---

## Environment Variables

| Variable | Where used | Purpose |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Client + server | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server only | Google OAuth client secret for token exchange |
| `VITE_FIREBASE_API_KEY` | Client | Firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | Client | Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase config |
| `VITE_FIREBASE_APP_ID` | Client | Firebase config |
| `FIREBASE_ADMIN_*` / service account | Server | Firebase Admin SDK for Firestore (server-side) |
| `VITE_VAPID_PUBLIC_KEY` | Client + server | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | Server only | VAPID private key |
| `VAPID_CONTACT_EMAIL` | Server only | Contact email for VAPID |
| `OPENAI_API_KEY` | Server only | OpenAI API key for goal relevance + goal labels |
| `OPENAI_MODEL` | Server only | OpenAI model to use (default: `gpt-5.4-mini`) |
| `CRON_SECRET` | Server only | Shared secret to authenticate the poll-new-mail cron endpoint |

---

## Easter Eggs / Fun Details

- **"You're Great!"** — Tapping the currently active tab in the bottom nav (e.g. tapping Inbox while already on Inbox) triggers a full-screen flash animation with a large green checkmark and "You're Great!" text, then fades out after 2 seconds.
- **"Get your game on!"** and **"I am cool"** — decorative (non-functional) items in the long-press email context menu.
- **Pull-to-refresh quotes** — Each pull-to-refresh shows a random inspirational quote from a 150-quote pool while the spinner animates.
- **Haptic feedback** — `navigator.vibrate(18)` fires when swipe/pull thresholds are hit on supported devices.
