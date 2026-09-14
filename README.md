<div align="center">
  <br />
  <h1>✦ Astral</h1>
  <p><strong>A self-hosted AI chat workspace — your keys, your data, your conversations.</strong></p>
  <p>
    <a href="#-features">Features</a> ·
    <a href="#-screens">Screens</a> ·
    <a href="#-how-it-works">How it works</a> ·
    <a href="#-local-setup">Local setup</a> ·
    <a href="#-supabase-setup">Supabase setup</a> ·
    <a href="#-environment-variables">Environment variables</a> ·
    <a href="#-deploy-to-vercel">Deploy to Vercel</a>
  </p>
  <br />

  [![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org)
  [![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev)
  [![Supabase](https://img.shields.io/badge/Supabase-Auth%20+%20DB-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
  [![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma&logoColor=white)](https://prisma.io)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b)](LICENSE)
</div>

---

## What is Astral?

Astral is an open-source chat application where **you own everything** — the AI provider keys, the conversation history, the database. There is no SaaS backend, no third-party storing your prompts, and no per-message billing through us.

Connect your own keys from Google Gemini, Groq, OpenAI, OpenRouter, or any OpenAI-compatible endpoint. Every conversation is stored in your own Supabase PostgreSQL database. Share sessions or individual messages via cryptographically-signed read-only links.

---

## ✦ Features

### Chat experience
- Multi-turn conversations stored in your own database
- File and image attachments (images inline, PDFs as context)
- Real-time typing indicator while the model responds
- Response latency shown per message
- Copy or share any individual message via a public link
- Keyboard shortcut `Enter` to send, `Shift+Enter` for newline

### Providers & models
- **Google Gemini** — direct Gemini API, no proxy
- **Groq** — ultra-fast LLaMA, Mixtral, and Gemma models
- **OpenAI** — GPT-4o, o1, and all OpenAI chat models
- **OpenRouter** — access to 200+ models including free tiers
- **Custom** — any OpenAI-compatible base URL (e.g. Ollama, Together AI, Fireworks)
- Automatic model discovery from connected providers
- Custom model aliases — register any `organization/model` ID with a friendly name
- Pause a custom model to hide it from the picker without deleting it
- Edit provider labels, base URLs, and API keys inline without recreating connections

### Privacy & security
- API keys encrypted at rest with AES-256-GCM before database write
- All API routes verify the Supabase session before any data access
- Share tokens are cryptographically random (`randomBytes(20)`)
- Keys never leave the server — client never sees the raw key

### Sharing
- Share an entire conversation as a read-only page
- Share a single message as a standalone page
- Share your public profile page with all public conversations
- Share a generated image with a direct link
- One-click copy for all share URLs
- Social share buttons (X, Facebook, LinkedIn, Email) on conversation shares

### Account
- Email and password authentication via Supabase Auth
- Sign-up with username, optional profile picture (PNG/JPG/WebP up to 2 MB)
- Password show/hide on all password fields
- Confirm-password validation on sign-up and password reset
- Email change with dual-confirmation flow
- Password reset via email link
- Avatar displayed as circular preview on sign-up and in settings
- Public profile page with shareable link

### UI & navigation
- Collapsible sidebar — full 276px or icon-rail 68px, toggled by click
- Search conversations in the sidebar
- Auto-generated session titles from your first message
- Light and dark themes, persisted across sessions
- Fully responsive — sidebar becomes a slide-in drawer on mobile
- Toast notifications for all actions (copy, share, error, success)
- Share dialog with URL copy button and social share icons

---

## ✦ Screens

### Sign in / Sign up
The auth page handles both sign-in and sign-up in one component. Switching modes animates in the extra sign-up fields.

- **Sign in** — email, password with show/hide toggle, forgot password link
- **Sign up** — username (validated against `/api/auth/username` with a 280ms debounce), circular avatar picker, email, password + confirm password
- Inline validation states: `validation-good` (green) for available username, `validation-note` (muted) for checking, `form-error` (red) for failures, `form-message` (green) for success messages like "Check your email"

### Password reset
Reached via the email link that Supabase sends. Two fields — new password and confirm — each with their own show/hide toggle. Validates that passwords match client-side before submitting. On success, redirects to `/` after 800ms.

### Chat workspace
The main screen. Left sidebar + right content area in a flex layout.

**Sidebar**
- Brand mark with collapse toggle button
- New conversation button
- Search box (filters the conversation list in real time)
- Conversation list — title, timestamp, delete button on hover
- Footer — Settings link and Sign out button

**Workspace header**
- Mobile hamburger menu (hidden on desktop)
- Conversation title (eyebrow label + session title)
- Theme toggle (Moon/Sun)
- Share chat button (only shown when a session exists)
- User badge with avatar/initials, username, dropdown with Settings + Sign out

**Conversation area**
- Greeting screen when no messages yet — username greeting, empty-state illustration
- Message list — user messages (surface-muted mark) and assistant messages (accent mark)
- Each message: role mark, sender name, model label, message content, latency footer, copy + share action buttons (visible on hover)
- Typing indicator (three bouncing dots) while waiting for response
- Sticky composer at the bottom, width-matched to the conversation column

**Composer**
- Paperclip button to attach files (images + PDFs, up to 3 files, up to 8 MB each)
- Attachment tray — shows attached files with individual remove buttons
- Model selector dropdown (left side) + selected model label (right side)
- Auto-resizing textarea (min 32px, max 92px)
- Send button (accent background, disabled when empty or loading)

### Settings
Single page, two-column grid layout on desktop, stacked on mobile.

- **Provider connections** — add form with provider type, connection name, API key, optional base URL; list of connections with inline edit and delete
- **Profile** — circular avatar preview with click-to-change, username input, save button, share public profile link
- **Password** — send reset email button (calls Supabase `resetPasswordForEmail`)
- **Email address** — current email shown, new email input with confirmation flow
- **Custom model aliases** — add form with display name, model ID (`organization/model`), provider selector; list with inline edit, pause/play toggle, and delete

### Share pages
Read-only pages for shared content — no auth required.

- `/share/[token]` — full conversation with owner info, message list, footer
- `/share/message/[token]` — single message card with session title and date
- `/profile/[token]` — public profile with avatar, username, shared conversations
- `/image/[token]` — shared image with download link

---

## ✦ How it works

### Authentication flow

1. User signs up → Supabase creates the auth user and sends a confirmation email
2. User clicks the confirmation link → lands on `/auth/callback?code=...`
3. The callback route exchanges the code for a session, then upserts a `UserProfile` row using the `username` and `avatarDataUrl` from `user_metadata`
4. User is redirected to `/` (or the `next` param if present)
5. Subsequent requests attach the Supabase session cookie; server components and API routes call `createClient()` and read the session from cookies — no extra round-trip to Supabase Auth servers for most operations

### Chat flow

1. User types a message and hits Send or `Enter`
2. Client sends `POST /api/hello` with `{ sessionId, messages, model }`
3. Server decrypts the user's API key for the requested provider
4. Server formats the request (OpenAI-style for most providers, Gemini native format for Gemini)
5. Response streams back from the provider
6. Server saves the user message and assistant reply to `chat_messages`, updates the session title, and writes a denormalised row to `questions` for analytics
7. Client receives `{ sessionId, id, message, model, latencyMs }` and updates the message list

### Encryption

Every provider API key is encrypted before being written to the database:

```
encryptApiKey(rawKey)
  → generate 12-byte random IV
  → AES-256-GCM encrypt using ASTRAL_ENCRYPTION_KEY
  → return "iv.authTag.ciphertext" (all base64url)
```

The `ASTRAL_ENCRYPTION_KEY` must be a 64-character hex string (32 bytes). It lives only in server environment variables and is never sent to the client.

---

## ✦ Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | Server components, API routes, file-based routing |
| UI library | React 19 | Concurrent features, latest hooks |
| Auth | Supabase Auth | Email/password, JWT sessions, email templates |
| Database | PostgreSQL (Supabase) + Prisma 6 | Type-safe queries, schema migrations with `db push` |
| Styling | Tailwind CSS v4 + custom CSS | Design tokens via CSS variables, no config file needed |
| Encryption | Node.js `crypto` (AES-256-GCM) | No external dependency, battle-tested algorithm |
| Icons | Lucide React | Consistent icon set |
| Social share | react-share + react-icons | Share buttons for X, Facebook, LinkedIn, Email |

---

## ✦ Local setup

### Prerequisites

- Node.js 18 or later
- A Supabase project (free tier works — see [Supabase setup](#-supabase-setup) below)
- At least one AI provider API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/astral.git
cd astral
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` — see the [Environment variables](#-environment-variables) section for every value and where to find it.

### 3. Push the database schema

```bash
npm run db:push
```

This syncs the Prisma schema to your Supabase database and regenerates the Prisma client. Expected output:

```
Your database is now in sync with your Prisma schema. Done in Xs
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create an account, then go to **Settings → Provider connections**, add your API key for any provider, and send your first message.

---

## ✦ Supabase setup

Supabase provides both the authentication layer and the PostgreSQL database. Follow these steps exactly.

### Step 1 — Create a project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **New project**
3. Choose your **organisation**, enter a **project name** (e.g. `astral`), pick a **region closest to your users**, and set a strong **database password**
4. Save the database password — you will need it in the connection strings
5. Wait ~2 minutes for the project to initialise

### Step 2 — Get your API keys

1. In the Supabase dashboard, go to **Project Settings** (gear icon) → **API**
2. Copy two values:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
```

### Step 3 — Get the database connection strings

Astral uses two connection strings:

- **Transaction pooler** (port `6543`, PgBouncer) — used by the app at runtime for all queries
- **Direct connection** (port `5432`) — used only by `prisma db push` for schema migrations

To find them:

1. In the Supabase dashboard, click **Connect** (top navigation bar)
2. Select the **Connection string** tab
3. Select **Transaction pooler** from the dropdown — copy the URI

```
DATABASE_URL=postgresql://postgres.abcde:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

4. Switch the dropdown to **Session pooler** or **Direct** — copy the URI, change the port to `5432`

```
DIRECT_URL=postgresql://postgres.abcde:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

> **Important:** Replace `[YOUR-PASSWORD]` with your actual database password. If it contains special characters, URL-encode them (e.g. `@` → `%40`).

> **Note:** Do not use the `db.<ref>.supabase.co` hostname — it requires IPv6. Use the pooler hostnames shown above.

### Step 4 — Configure auth redirect URLs

This tells Supabase where to send users after email confirmation or password reset.

1. In the Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to `http://localhost:3000`
3. Under **Redirect URLs**, click **Add URL** and add:
   ```
   http://localhost:3000/auth/callback
   ```
4. Click **Save**

You will add your production URL here again when deploying to Vercel.

### Step 5 — Email templates (optional but recommended)

Supabase sends transactional emails for account confirmation and password reset. The default templates work, but you can customise them:

1. Go to **Authentication** → **Email Templates**
2. You'll see templates for:
   - **Confirm signup** — sent when a user registers
   - **Reset password** — sent when the user clicks "Forgot your password?"
   - **Change email address** — sent to both old and new email when a user changes their address
   - **Magic Link** — not used by Astral (can leave as-is)

The `{{ .ConfirmationURL }}` token in each template is replaced by Supabase with the correct link pointing back to `/auth/callback`.

### Step 6 — Push the schema

Back in your terminal, with your `.env.local` filled in:

```bash
npm run db:push
```

Prisma will connect to Supabase via `DIRECT_URL` and create all the tables. You can verify in the Supabase dashboard under **Table Editor** — you should see:

- `chat_sessions`
- `chat_messages`
- `custom_models`
- `questions`
- `shared_images`
- `user_profiles`
- `user_provider_connections`
- `user_provider_keys`

---

## ✦ Environment variables

Copy `.env.example` to `.env.local` for local development. For Vercel, add each variable in the project settings dashboard.

```env
# ── Supabase ──────────────────────────────────────────────────────────────────

# Your Supabase project URL
# Found at: Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Your Supabase anon (public) key
# Found at: Project Settings → API → Project API keys → anon / public
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Database ──────────────────────────────────────────────────────────────────

# Transaction pooler string — used by the app at runtime (port 6543)
# Found at: Connect → Connection string → Transaction pooler
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection string — used only by prisma db push (port 5432)
# Found at: Connect → Connection string → Direct
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# ── Encryption ────────────────────────────────────────────────────────────────

# 64-character hex string (32 bytes) for AES-256-GCM encryption of stored API keys
# Generate once with: openssl rand -hex 32
# NEVER change this after users have saved provider keys — it will make all keys unreadable
ASTRAL_ENCRYPTION_KEY=a3f8c2e1d0b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1

# ── App URL ───────────────────────────────────────────────────────────────────

# Full URL of your deployment — used for generating share links
# Local: http://localhost:3000
# Production: https://your-app.vercel.app
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Variable reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL. Prefix `NEXT_PUBLIC_` makes it available in the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key. Safe to expose — Supabase Row Level Security controls access. |
| `DATABASE_URL` | ✅ | PgBouncer pooler URL. Used by Prisma at runtime. Must include `?pgbouncer=true`. |
| `DIRECT_URL` | ✅ | Direct Postgres URL. Used only by `prisma db push` and `prisma migrate`. |
| `ASTRAL_ENCRYPTION_KEY` | ✅ | 64-char hex. Encrypts/decrypts provider API keys. Must be stable across deploys. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Base URL for share links. Set to your Vercel domain in production. |

---

## ✦ Connecting AI providers

All provider keys are stored per-user in the encrypted `user_provider_connections` table. No keys live in `.env` at runtime — everything goes through **Settings → Provider connections** in the UI.

| Provider | API key page | Notes |
|---|---|---|
| **Google Gemini** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Free tier available. Gemini 1.5 Flash is fast and cheap. |
| **Groq** | [console.groq.com/keys](https://console.groq.com/keys) | Free tier with rate limits. LLaMA 3 and Mixtral. |
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Requires billing. GPT-4o, o1, o3-mini. |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | 200+ models. Free tier includes Llama, Gemma, and others. |
| **Custom** | — | Enter your own base URL. Works with Ollama, Together AI, Fireworks, etc. |

After adding a provider, the model dropdown in chat auto-discovers available models. If a model you want isn't listed, add it as a custom alias in **Settings → Custom model aliases** using the `organization/model-id` format.

---

## ✦ Deploy to Vercel

### Step 1 — Push to GitHub

```bash
# If this is a new repo
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/your-username/astral.git
git push -u origin main

# If you already have commits
git add .
git commit -m "ready to deploy"
git push
```

### Step 2 — Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Add New… → Project**
3. Under **Import Git Repository**, find `astral` and click **Import**
4. Vercel auto-detects Next.js — leave the build settings as-is
5. Expand **Environment Variables** and add all six variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `DATABASE_URL` | Transaction pooler string (port 6543) |
| `DIRECT_URL` | Direct connection string (port 5432) |
| `ASTRAL_ENCRYPTION_KEY` | Your 64-char hex encryption key |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` (use your actual domain) |

6. Click **Deploy** and wait ~2 minutes

### Step 3 — Update Supabase redirect URLs

After Vercel gives you a deployment URL (e.g. `https://astral-nu.vercel.app`):

1. Supabase dashboard → **Authentication** → **URL Configuration**
2. Update **Site URL** to your Vercel URL
3. Add a new **Redirect URL**: `https://your-app.vercel.app/auth/callback`
4. Save

### Step 4 — Verify

1. Open your Vercel URL
2. Create an account — check that the confirmation email arrives and the link works
3. Go to Settings → Provider connections → add an API key
4. Send a message — confirm the response appears and is saved in the sidebar
5. Click the Share chat button — confirm the link opens in a private window without auth

### Custom domain (optional)

1. In Vercel project settings → **Domains** → **Add**
2. Enter your domain (e.g. `chat.yourdomain.com`)
3. Add the CNAME record shown by Vercel to your DNS provider
4. Once the domain is live, update `NEXT_PUBLIC_SITE_URL` in Vercel env vars to your custom domain
5. Add the new domain's callback URL to Supabase: `https://chat.yourdomain.com/auth/callback`

---

## ✦ Scripts

```bash
npm run dev           # Development server with hot reload
npm run build         # Production build (also runs prisma generate)
npm run start         # Serve the production build locally
npm run lint          # ESLint
npm run db:push       # Sync Prisma schema → database (no migration files)
npm run db:generate   # Regenerate Prisma client after schema changes
```

---

## ✦ Database schema

```
user_profiles            — username, avatar, public profile token, isPublic flag
user_provider_connections — per-user provider label, base URL, encrypted API key
user_provider_keys        — legacy single-key storage (OpenRouter only, kept for migration)
custom_models             — user-defined model aliases with pause/enable state
chat_sessions             — conversation containers: title, model, share token
chat_messages             — individual messages: role, content, model, latency, share token
questions                 — denormalised Q&A log with token usage for analytics
shared_images             — base64 images accessible via public token link
```

---

## ✦ Security notes

- Provider API keys are **never stored in plaintext**. Every key is AES-256-GCM encrypted with a random 12-byte IV before the database write. The ciphertext, IV, and auth tag are stored as a single dot-delimited string.
- The `ASTRAL_ENCRYPTION_KEY` is a server-only environment variable. It is never sent to the browser or included in any client bundle.
- All API routes that touch user data call `supabase.auth.getUser()` or `getSession()` before any database operation. Unauthenticated requests receive a 401.
- Share tokens are generated with `randomBytes(20).toString('base64url')` — 160 bits of entropy, URL-safe, no guessable patterns.
- Profile images and generated images are stored as base64 data URLs in PostgreSQL. For high-traffic production use, consider migrating image storage to Supabase Storage buckets.

---

## ✦ License

[MIT](LICENSE) — free to use, fork, modify, and deploy.
