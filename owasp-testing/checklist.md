# OWASP Top 10 — Church Management System

Checked each session. Mark status: ✅ Pass | ⚠️ Risk | ❌ Fail | 🔲 Not tested

---

## A01 — Broken Access Control

| Check | Status | Notes |
|-------|--------|-------|
| `/admin/*` routes require `admin` role | ✅ | `requireRole("admin")` in layout |
| `/leader/*` routes require `event_leader` or `admin` | ✅ | `requireRole(["admin","event_leader"])` |
| Middleware redirects unauthenticated users | ✅ | `src/proxy.ts` (middleware.ts removed — was causing conflict) |
| Role changes require server-side admin check | ✅ | `PATCH /api/users/[id]` verifies requester is admin |
| Event leaders cannot see giving data | 🔲 | RLS not fully verified |
| RLS enabled on all tables | 🔲 | Needs DB audit |

## A02 — Cryptographic Failures

| Check | Status | Notes |
|-------|--------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` never in client code | ✅ | Server-only; `admin.ts` is server-only |
| `STRIPE_SECRET_KEY` never in client code | ✅ | Server-only |
| `RESEND_API_KEY` never in client code | ✅ | Only in `api/communications/send/route.ts` |
| No secrets in `NEXT_PUBLIC_*` vars | ✅ | Only URL and anon key are public |

## A03 — Injection

| Check | Status | Notes |
|-------|--------|-------|
| All DB queries use Supabase parameterized API | ✅ | No raw SQL in services |
| No `supabase.rpc()` with unescaped user input | ✅ | No rpc calls found |
| Server Actions re-validate with Zod | 🔲 | Forms not yet using Server Actions |

## A04 — Insecure Design

| Check | Status | Notes |
|-------|--------|-------|
| Donation records are immutable (no edit) | 🔲 | PaymentService has `deletePayment` — review |
| Stripe payments blocked from deletion | ✅ | `deletePayment` checks `stripe_payment_intent_id` |
| Race condition on duplicate registrations | ✅ | DB unique constraint + `23505` handling |

## A05 — Security Misconfiguration

| Check | Status | Notes |
|-------|--------|-------|
| Public endpoints rate-limited | 🔲 | `register/[signupUrl]` has no rate limiting |
| CORS not misconfigured | 🔲 | Not explicitly configured |
| Error messages don't leak stack traces | ✅ | Services return sanitized strings |

## A06 — Vulnerable Components

| Check | Status | Notes |
|-------|--------|-------|
| Dependencies up to date | 🔲 | Run `npm audit` each session |
| No known CVEs in `package.json` | 🔲 | Needs check |

## A07 — Authentication Failures

| Check | Status | Notes |
|-------|--------|-------|
| Auth handled by Supabase (not custom) | ✅ | |
| Session refresh in middleware | ✅ | `updateSession()` called on every request |
| No client-side-only auth checks | ✅ | All role checks server-side after Phase 2 |
| Login page has no brute-force protection | 🔲 | Supabase default rate limits only |

## A08 — Software & Data Integrity

| Check | Status | Notes |
|-------|--------|-------|
| Stripe webhook verifies signature | 🔲 | Webhook handler needs review |
| Automation actions are idempotent | 🔲 | Not yet built |
| Audit log on all sensitive mutations | ⚠️ | `audit_logs` written by services, not all paths covered |

## A09 — Logging & Monitoring

| Check | Status | Notes |
|-------|--------|-------|
| Failed auth attempts logged | 🔲 | Supabase logs; no app-level logging |
| Email send failures logged | ✅ | `email_logs` with `status: "failed"` |
| Service errors logged to console | ✅ | All services `console.error` on failure |
| No sensitive data in logs | ⚠️ | Some `console.error(err)` may expose PII |

## A10 — Server-Side Request Forgery (SSRF)

| Check | Status | Notes |
|-------|--------|-------|
| No user-controlled URLs fetched server-side | ✅ | Only Resend API URL is hardcoded |

---

## Action Items

- [ ] Add rate limiting to `register/[signupUrl]` (public endpoint)
- [ ] Add rate limiting to `forgot-password` (prevents email abuse)
- [ ] Audit RLS policies for all tables — verify event_leader scope
- [ ] Run `npm audit` and resolve high/critical CVEs
- [ ] Review Stripe webhook signature verification
- [ ] Replace `console.error(err)` with sanitized logging to avoid PII leakage
- [ ] Configure Resend SMTP in Supabase to remove 2/hr email rate limit

## Session Notes
- Session 004 (2026-04-18): Fixed proxy middleware conflict, added password reset flow (PKCE), fixed admin client for cached queries, fixed RLS bypass for user listing via `/api/users`
