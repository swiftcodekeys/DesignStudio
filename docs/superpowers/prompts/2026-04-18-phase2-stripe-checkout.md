# Phase 2 — Stripe Checkout Resume Prompt

**Prerequisite — relaxed:** Phase 2 CAN run in parallel with Phase 1 as of commit `3ac8a70` on `feat/quote-redesign`. The data contract Phase 2 reads (`drawToolData.mapboxSnapshotUrl`, `calculateZoneQuote` subtotal output) is stable. Phase 1's remaining work is UI polish and client-side bugs — none of it changes the data shape.

**Parallel-execution rules (IMPORTANT):**

1. **Cut a new branch**: `feat/phase2-stripe-checkout` off commit `3ac8a70` (current HEAD of `feat/quote-redesign`). Do NOT share the Phase 1 branch — this prompt overrides the plan file which says stay on `feat/quote-redesign`.
2. **Do not modify `drawToolData` shape** without first landing the shape change on `feat/quote-redesign` and rebasing this branch onto it. If Phase 2 needs a field (e.g., `quoteId` for Stripe idempotency), add the field to `buildDrawToolData` in `MapboxDrawView.js` via a coordinated commit on `feat/quote-redesign` FIRST, then pull it.
3. **Expected file-overlap conflicts** when rebasing onto the finished Phase 1: `QuoteStep6_Review.js` (Phase 1 fixes scroll, Phase 2 adds checkout CTA) and `app.js` (Phase 2 adds `/checkout` route). Both trivial, resolve in favor of keeping both changes.
4. **Coordinate timing**: Phase 2 ships on its own branch but merges to `main` AFTER Phase 1 is merged. Open the PR now; don't merge until Phase 1 lands.

## Session Goal

Implement Phase 2 per `docs/superpowers/plans/2026-04-17-mapbox-phase2-stripe-checkout.md`. Add a dedicated `/checkout` page (Option B layout from spec §2.2) with Stripe auth-then-capture. Support cards + Apple Pay + Google Pay + Affirm + Klarna + Afterpay. Webhook fires to admin CRM on authorization. Sarah captures partial amounts from admin CRM after 24h review.

## Environment

- Working directory: `C:\Users\sarah\Desktop\App Repos\fence-tool`
- Branch: `feat/phase2-stripe-checkout` (NEW — cut off `3ac8a70` per parallel-execution rules above)
- HEAD at session start: `3ac8a70` (or later if Phase 1 has shipped coordination commits since)
- New deps needed: `@stripe/stripe-js`, `@stripe/react-stripe-js`
- New worker: `workers/stripe-checkout/` — Cloudflare Worker with `/api/checkout`, `/api/capture`, `/api/webhook` endpoints
- Stripe API version target: 2024-11-20+ with `capture_method: 'manual'` (auth now, capture within 7 days)
- Stripe MCP server is available in the user's Claude session — use it for live Stripe account introspection rather than pasting test keys into the codebase
- Stripe webhook signing secret will be set as a Pages/Worker secret via `wrangler secret put STRIPE_WEBHOOK_SECRET`
- Playwright: same config as Phase 1 (port 3000 baseURL, webServer auto-start)
- Test baseline: whatever Phase 1 exits at (expected 53+ vitest + 2 green E2E)

## Plan

`docs/superpowers/plans/2026-04-17-mapbox-phase2-stripe-checkout.md` — read it in full. It enumerates tasks 2.1.x through 2.A.x with checkboxes. Use superpowers:subagent-driven-development to execute task-by-task.

## Hard Rules (copy from Phase 1, these stand throughout the mapbox workstream)

- Branch `feat/quote-redesign` only. No new branches. No `--amend`. No hook skipping. One fix = one commit.
- Never modify `gate_tool/js/ultra_dsg_min.js`, `SPATIAL_TRUTH.json`, `spatialConstants.js`.
- **Never use the word "dogfood"** — see `~/.claude/projects/C--Users-sarah/memory/feedback_no_dogfood_term.md`.
- User prefers autonomous execution with minimal questions EXCEPT on UX judgment calls and payment-flow decisions that affect real money. For anything involving captured amounts, refund policies, or user-visible payment copy, pause and confirm with user before coding.
- Evidence before done: no task complete without runtime green tests including Stripe test-mode payment intents exercised end-to-end.

## Phase 2 Special Rules (money-adjacent)

- Use Stripe **test mode** for all automated testing. Never hit live keys from tests.
- Webhook signing MUST be verified — any test or production code that skips signature verification is rejected.
- `capture_method: 'manual'` is load-bearing; don't "simplify" to automatic capture. Sarah reviews every order within 24h and captures the real amount.
- Payment amount displayed to the customer MUST match the amount authorized on the PaymentIntent. Add a test that asserts these are equal byte-for-byte.
- On webhook receipt, the admin CRM endpoint must persist `stripe_payment_intent_id` + `authorized_amount_cents` — that's the handoff to Phase 3.
- Idempotency keys on PaymentIntent creation: use the wizard session ID or quote ID so accidental double-submit doesn't create two auth'd payments.

## E2E Validation Target

Same discipline as Phase 1 — no "done" without green Playwright.

Add `e2e/checkout-authorize.spec.js`:
1. Complete a full draw → quote flow (reuse Phase 1 specs if possible).
2. Click through to /checkout.
3. Fill Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. Submit → assert success page URL is `/checkout/success`.
5. Assert a PaymentIntent exists in Stripe test mode with `status === 'requires_capture'` and correct `amount`.
6. Assert the admin CRM endpoint received the webhook with `payment_status === 'authorized'`.

Test must run green before Phase 2 is complete. Screenshots of the checkout page at each step.

## Phase Exit

When Phase 2 is complete with evidence, next session picks up `docs/superpowers/prompts/2026-04-18-phase3-admin-crm.md`.
