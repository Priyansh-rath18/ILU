# Iron Ledger

A deployable version of the workout + nutrition tracker: Next.js app, Google
sign-in, and a Postgres database, so every user gets their own private data
that only they can see or edit.

## Stack

- **Next.js 14** (App Router) — frontend + API routes in one deployable app
- **NextAuth.js** — Google OAuth only (no passwords are ever stored)
- **Prisma + Postgres** — one row per user per day, always queried scoped to
  the signed-in user's id
- **Zod** — every API request body is validated before it touches the database

## 1. Set up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   create a project (or use an existing one).
2. **APIs & Services → OAuth consent screen** — choose "External," fill in
   the app name and your email, and add your own Google account as a test
   user (or publish it once you're ready for others to use it).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type: "Web application."
4. Add an **Authorized redirect URI**:
   - Local dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-app-domain.com/api/auth/callback/google`
5. Copy the generated **Client ID** and **Client Secret** — you'll need them
   in the next step.

## 2. Set up the database

Any managed Postgres works. The free tiers of
[Neon](https://neon.tech) or [Supabase](https://supabase.com) are both fine
to start with. Copy the connection string it gives you.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — from step 2
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 1
- `NEXTAUTH_SECRET` — generate one with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev, your real domain in production

## 4. Install, migrate, run

```bash
npm install
npx prisma db push   # creates all tables in your database
npm run dev          # http://localhost:3000
```

Sign in with Google and you should land on the dashboard.

## 5. Deploy

The easiest path is **Vercel** (same company as Next.js, generous free tier):

1. Push this folder to a GitHub repo.
2. Import the repo in [vercel.com/new](https://vercel.com/new).
3. Add the same environment variables from your `.env` in the Vercel project
   settings (Settings → Environment Variables).
4. Set `NEXTAUTH_URL` to the exact `https://...vercel.app` URL Vercel gives
   you (or your custom domain), and add the matching redirect URI back in
   the Google Cloud Console from step 1.
5. Deploy. Vercel runs `prisma generate` automatically via the `postinstall`
   script; run `npx prisma db push` once from your machine (pointed at the
   production `DATABASE_URL`) to create the tables in production.

Any other Node host (Railway, Render, Fly.io, your own server) works too —
the app is just a standard Next.js app once `npm run build && npm start`
is set up with the same environment variables.

## Security measures built in

No app is "unhackable," but this covers the standard risks for an app like
this:

| Risk | How it's handled |
|---|---|
| **SQL/NoSQL injection** | All database access goes through Prisma's parameterized queries — no raw string-built SQL anywhere in the codebase. |
| **Cross-user data leakage (broken access control)** | Every query is filtered by `userId` taken from the server-side session — never from a client-supplied field — so one account can never read or write another's rows. |
| **Malformed/oversized/malicious input** | Every API route validates its body with a strict Zod schema (fixed enums, numeric bounds, capped array lengths) before doing anything with it. Exercise names are checked against a fixed server-side allow-list — a request can't invent a new "exercise" key. |
| **XSS (stored or reflected)** | React escapes all rendered output by default; the codebase never uses `dangerouslySetInnerHTML`. The CSP header also blocks any inline/remote script injection as a second layer. |
| **CSRF** | The session cookie is `httpOnly` + `SameSite=Lax` (set by NextAuth), so it isn't sent on cross-site requests; API routes additionally check the `Origin` header on every write. |
| **Credential theft / password breaches** | There are no passwords at all — authentication is entirely delegated to Google via OAuth, and sessions are database-backed so they can be revoked instantly. |
| **Session hijacking** | Sessions are stored server-side (not signed JWTs), expire after 30 days, and are transmitted only over HTTPS in production (enforced by `Strict-Transport-Security`). |
| **Clickjacking** | `X-Frame-Options: DENY` and `frame-ancestors 'none'` in the CSP. |
| **MIME-sniffing / info leakage** | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and error responses never leak stack traces or internal details to the client (logged server-side only). |
| **Brute-force / scripted abuse** | A per-user rate limiter on every API route. It's in-memory, which is fine for a single-instance deployment — see the comment in `lib/rateLimit.js` for the one-line swap to a shared store (Upstash Redis) if you scale to multiple server instances. |

### Things worth doing as you grow this

- Rotate `NEXTAUTH_SECRET` and OAuth credentials if you ever suspect they've
  leaked, and never commit `.env` to git (it's already git-ignored).
- Turn on your database provider's automatic backups.
- Run `npm audit` periodically and keep dependencies current — most real-world
  breaches come from an unpatched dependency, not a novel exploit.
- **Next.js 14 is past its official end-of-life (Oct 2025).** This project
  pins `next@14.2.35`, the last release patched against the known December
  2025 advisories, because it's the most stable combination with
  `next-auth@4` and the Prisma adapter. Next.js 15/16 require React 19 and
  Auth.js v5 (next-auth's successor) for a fully compatible upgrade path —
  worth planning once Auth.js v5 is out of beta, since 14.x won't receive
  patches for future CVEs.
- If you expect real concurrent load, replace the in-memory rate limiter
  with Upstash Redis (`@upstash/ratelimit`) — noted directly in the code.
