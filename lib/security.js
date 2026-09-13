// Defense-in-depth CSRF check for state-changing requests.
// The session cookie is already httpOnly + SameSite=Lax (set by NextAuth) so
// cross-site requests can't carry it in the first place; this adds a second
// layer by rejecting any mutating request whose Origin doesn't match our own.
export function isTrustedOrigin(req) {
  const origin = req.headers.get("origin");
  const configured = process.env.NEXTAUTH_URL;
  if (!configured) return true; // local dev fallback
  if (!origin) return true; // same-origin requests from some clients omit Origin
  try {
    return new URL(origin).host === new URL(configured).host;
  } catch {
    return false;
  }
}

// Never echo raw error messages/stack traces back to the client — log
// server-side, return a generic message to the browser.
export function safeError(err, fallback = "Something went wrong") {
  console.error(err);
  return fallback;
}
