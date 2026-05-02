# Phase 3 — Admin CRM Extensions Resume Prompt

**Prerequisite: Phases 1 and 2 must be fully complete and shipped.** Phase 3 operates across TWO repos — fence-tool (minor changes) AND the admin CRM repo. Do not start until Phase 2's webhook is forwarding authorized payments to the CRM endpoint.

## Session Goal

Implement Phase 3 per `docs/superpowers/plans/2026-04-17-mapbox-phase3-admin-crm.md`. Extend the admin CRM with:
- Slope intelligence (yellow "Possible slope" pill on lead cards, red warning when EPQS ≠ customer-selected rackability)
- Partial-capture controls (CaptureButton for Sarah to capture amounts from auth'd PaymentIntents)
- New D1 columns: `terrain_flag`, `epqs_data`, `mapbox_snapshot_url`, `stripe_payment_intent_id`, `payment_status`, `authorized_amount_cents`, `captured_amount_cents`
- Email worker enhancements: terrain check row + red warning when EPQS disagrees with customer

## Environment

**Cross-repo work.** Two working directories:

1. Admin CRM: `C:\Users\sarah\Desktop\grandview-quote-system` (separate repo — `admin-app/` React app + `worker/` Cloudflare Worker + D1 database)
2. Fence-tool: `C:\Users\sarah\Desktop\App Repos\fence-tool` (minor tweaks — email worker extension, data shape verification)

Branches:
- Admin CRM: create `feat/phase3-slope-crm` off `main`
- Fence-tool: stay on `feat/quote-redesign`

- D1 database name: check admin CRM repo's `worker/wrangler.toml` for the binding name
- New migration: `worker/src/migrations/001_terrain_and_stripe.sql`
- React admin app uses Vite (not webpack like fence-tool) — tooling differs
- Playwright may or may not be set up in the admin CRM repo; check before assuming

## Plan

`docs/superpowers/plans/2026-04-17-mapbox-phase3-admin-crm.md` — read in full. Enumerates tasks 3.1.x through 3.A.x. Use superpowers:subagent-driven-development.

## Hard Rules

- Branch `feat/phase3-slope-crm` in admin CRM repo; `feat/quote-redesign` in fence-tool. Keep them aligned by making paired commits when they depend on each other.
- Never modify the locked Ultra files in fence-tool.
- **No "dogfood" term** — see memory.
- D1 migrations are one-way in production. Test the migration against a dev D1 instance first. Add a rollback migration in the same PR.
- Money-adjacent rules still apply: capture amounts must match what customer authorized; PATCH endpoints must verify auth (webhook signature or admin session).
- User prefers autonomous execution EXCEPT for admin UX changes (Sarah actively uses this tool) — pause and confirm on LeadCard, LeadList filter, QuoteDetail layout changes.

## Data Flow To Verify

Phase 2 emits webhook → Phase 3 handles it:
1. Stripe webhook POST → `worker/src/index.js` verifies signature → PATCH `/leads/by-payment-intent/:id` persists payment fields.
2. Admin UI reads from D1 → renders SlopePill, TerrainSection, CaptureButton per lead.
3. CaptureButton POSTs to fence-tool's `workers/stripe-checkout/api/capture` with the captured amount → Stripe captures → webhook back to CRM with `captured_amount_cents`.

End-to-end test must cover this full loop in Stripe test mode.

## E2E Validation Target

Admin CRM repo likely needs Playwright setup. Add specs that:
1. Seed a lead with a `stripe_payment_intent_id` in a test-mode auth'd state.
2. Open the admin UI, find the lead, click CaptureButton.
3. Assert the capture POST succeeds with the correct amount.
4. Assert Stripe PaymentIntent.status transitions `requires_capture` → `succeeded`.

## Phase Exit

When Phase 3 is complete with evidence across both repos, next session picks up `docs/superpowers/prompts/2026-04-18-phase4-calculator-and-polish.md`.
