# Escape Hatch Modal — Design Spec

**Date:** 2026-04-17
**Branch:** `feat/quote-redesign`
**Status:** Design approved, ready for implementation plan
**Supersedes / relates to:** Task 5 of the April 2026 wizard-redesign bug-fix batch
  (see `docs/journal-archive-2026-04.md` line 625)

---

## Problem

The quote wizard (`WizardShell.js`) has six steps. Two escapes already exist:

- **"Switch to full configurator →"** pill in the progress bar — routes power users to `/studio`.
- **`handleTalkToExpert`** — navigates to `/studio?view=contact`, but is only wired on step 6 (`ZoneQuoteSummary`).

Neither serves the consultative rescue case the research doc flags as a universal competitor pattern
(see `docs/research/post-rackability-research.md` line 492: *"Preserve the sketch-upload / photo-upload
escape hatch in every option. Every competitor consultative brand offers it. Customers with weird yards
need a way out of the geometric UI."*).

And the wizard fires `trackDropoff` on `beforeunload` (WizardShell.js:247-255) but captures nothing —
every abandoned session is a silently lost lead.

## Goal

Add a single "escape hatch" modal available from every wizard step that:

1. Rescues stuck users with a sketch/photo upload path.
2. Salvages abandonment by capturing a contact so the user can resume later.
3. Extends (does **not** replace) the existing two escapes.

## Non-goals

- No new admin CRM UI work in this spec — extend the existing CRM at `grandview-admin.pages.dev` to
  handle the new `submitAction: 'help'` records in a follow-up.
- No R2 bucket, no new worker endpoint. Reuse the existing `/leads` worker.
- No idle-timer trigger — it interrupts users who are just thinking.

---

## Architecture

### Component structure

| File | Status | Purpose |
|---|---|---|
| `EscapeHatchModal.js` | **new** | Presentational modal. Matches `PoolPopup.js` conventions. |
| `useEscapeHatchTriggers.js` | **new** | Custom hook — wires `mouseleave` + `visibilitychange` listeners, enforces one-shot-per-session. |
| `WizardShell.js` | edited | Adds 3 state hooks, 1 hook call, renders `<EscapeHatchModal>`, adds "Need help?" pill to progress bar. |
| `styles.css` | edited | New `.escape-hatch-*` block following `.wizard-*` / `.pool-popup-*` conventions. |
| `analytics.js` | edited | Adds `trackEscapeHatchOpen`, `trackEscapeHatchSubmit`, `trackEscapeHatchDismiss`. |

### State flow

All modal state lives in `WizardShell` — matches existing `PoolPopup`/`PoolCompliancePopup`/`DesignReviewPage` pattern. No context provider.

```
pill click        → setEscapeTrigger('pill')        → setShowEscapeHatch(true)
exit-intent fires → setEscapeTrigger('exit-intent') → setShowEscapeHatch(true)
                                                    + sessionStorage.setItem('gv_escape_fired','1')
user closes       → setShowEscapeHatch(false)
                    (sessionStorage NOT cleared — pill reopens fine, exit-intent stays spent)
user submits      → POST → success state in modal → auto-close after 4s
```

### Trigger behavior

- **Pill** (`<button class="wizard-escape-help">Need help?</button>`) — always visible, all six steps, inserted between the Grandview logo and the existing "Switch to full configurator" button in the progress bar (WizardShell.js:670-690). Visual weight matches the existing pill; color uses `--text-secondary` / neutral gray border rather than the `--brand` blue the existing pill uses, so the two don't compete for attention.
- **Exit-intent** — fires at most once per session via `sessionStorage['gv_escape_fired']`; only active when `step >= 2`.
  - Desktop: `mouseleave` on `document.documentElement` where `e.clientY <= 0`.
  - Mobile: `visibilitychange` where `document.hidden === true` AND the previous visibility was visible (guards against mount false-positives).

---

## UX

### Modal layout

440px wide on desktop, full-viewport below 600px. Sticky header + sticky footer on mobile so the CTA is always reachable.

- **Title:** "Stuck? We'll help." (20px / weight 800, `--text-primary`)
- **Subhead** (swaps by trigger):
  - Pill: *"Our Michigan team responds within one business day."*
  - Exit-intent: *"Before you go — we can pick up where you left off, or help if you're stuck."*

### Form fields

| Field | Required | Type | CRM field |
|---|---|---|---|
| Email | ✅ | `<input type="email" required>` | `Email` |
| Phone | optional | `<input type="tel">` | `Phone` |
| Name | optional | `<input type="text">` | `Name` |
| What's tricky? | optional | `<textarea>` 3 rows, 500 char max | `helpNote` (new) |
| Upload | optional | drag-drop zone with thumbnail preview | `helpUploadDataUrl` (new, base64) |

Below the form:

> Your current design is attached 📐

Tiny reassurance row — visually subtle. Tells the user the 3D snapshot + partial config auto-attach, so they don't feel like they're starting over.

### Upload pipeline (client-side, inside the modal)

1. User drops or selects a file.
2. If PDF: pass through. If > 2MB → inline error *"PDF too large — email it to sales@grandviewfence.com instead"*.
3. If image: load into `<img>`, draw to `<canvas>` rescaled to max 1600px on long edge, export as JPEG at quality 0.75, store as data URL.
4. If the output data URL > 900KB (safety threshold) → same email-fallback inline error.
5. Show 96×96 thumbnail in the drop zone with remove-✕ overlay.

Accepted MIME types: `image/jpeg`, `image/png`, `application/pdf`.

### CTAs

- **Primary:** `Send my request →` — uses existing `--cta` token (`#d4753a`).
- **Secondary:** `Maybe later` — dismisses, fires `trackEscapeHatchDismiss`.
- **Close `✕`** in top-right — same as Maybe later.

### Success state

Modal swaps to success UI after a 200 response:
- Green check icon
- *"Thanks — we'll be in touch."*
- *"Reference ID: GVH-XXXXXX"*
- Auto-closes after 4 seconds
- Wizard state unchanged — user can keep configuring

---

## Data flow

### Submission payload

Reuses `submitQuoteToCRM` in `WizardShell.js:599-616` with a new `submitAction: 'help'` value. No worker changes.

```js
{
  quoteId: 'GVH-' + random6(),          // new prefix distinguishes help from quote/order
  submitAction: 'help',
  source: 'escape-hatch-modal',
  trigger: 'pill' | 'exit-intent',
  wizardStep: step,                      // 1-6
  currentZone: currentZone || null,      // 'front' | 'back' | 'gate' | null

  // User-provided
  Name: '',
  Email: '',                             // required
  Phone: '',
  helpNote: '',
  helpUploadDataUrl: null,               // base64 data URL or null

  // Auto-attached context (same helpers used by quote submission)
  snapshotDataUrl: localStorage['gv_design_snapshot'] || null,
  zones: buildQuotePayload().zones,      // partial-config dump
  grandTotal: getGrandTotal(...) || 0,
}
```

### Endpoint

`POST https://grandview-crm.sarah-13a.workers.dev/leads` — unchanged. The worker already accepts arbitrary JSON; new fields pass through to D1 without a schema change required for MVP capture.

### Admin CRM follow-up (not in this spec's scope)

The CRM at `grandview-admin.pages.dev` will need — in a separate ticket:
- Filter / badge for `submitAction === 'help'` lead cards.
- Display the `helpNote` and `helpUploadDataUrl` on the lead detail view.

Out-of-scope here. Captured leads are visible in the existing CRM list meanwhile — they just won't be visually distinguished until the follow-up ticket ships.

---

## Error handling

All errors display inline in the modal (no `alert()` calls):

| Condition | Message | Location |
|---|---|---|
| Network / 5xx | "Couldn't send — please try again or email sales@grandviewfence.com." | Red banner below CTA |
| File > size limit | "File too large — email it to sales@grandviewfence.com instead." | Inline below drop zone |
| Unsupported MIME | "JPG, PNG, or PDF only." | Inline below drop zone |
| Missing email | HTML5 `required` + `type="email"` | Native validation |

On error: CTA re-enables, form values preserved, user can retry.

---

## Analytics

Extend `analytics.js`:

- `trackEscapeHatchOpen(trigger, step)` — on modal open.
- `trackEscapeHatchSubmit(hadUpload: boolean, hadNote: boolean, step: number)` — on successful 200 response.
- `trackEscapeHatchDismiss(trigger, step)` — on close without submit (✕ or "Maybe later").

These sit alongside the existing `trackZoneSelection`, `trackQuoteComplete`, `trackSummaryView`, `trackDropoff`.

---

## Testing plan

- **Playwright:** open wizard, verify pill visible on all steps (1-6). Click pill on each step — modal opens. Submit empty form — email validation fires. Submit with email only — success state shows, reference ID visible.
- **Exit-intent desktop:** step 2, move mouse above viewport — modal opens. Close, move mouse again — modal does not reopen (session guard).
- **Exit-intent mobile** (Playwright with mobile viewport + touch events): step 2, trigger `visibilitychange` — modal opens.
- **Upload:** drop a 3MB JPEG — compresses, thumbnail appears, data URL < 900KB. Drop a 5MB PDF — inline error.
- **Network error:** mock `/leads` 500 — red banner appears, CTA re-enables.
- **Build:** `npx webpack --mode development` compiles with zero errors.

---

## File-by-file change summary

| File | Lines changed (est.) | Notes |
|---|---|---|
| `EscapeHatchModal.js` | ~260 new | Presentational modal, form, upload, success state. |
| `useEscapeHatchTriggers.js` | ~50 new | Desktop + mobile exit-intent hook, one-shot session guard. |
| `WizardShell.js` | ~30 edited | 3 useState hooks, useEscapeHatchTriggers call, pill button in progress bar, modal render, submit handler (calls submitQuoteToCRM with submitAction='help'). |
| `analytics.js` | ~15 new | Three new track functions. |
| `styles.css` | ~120 new | `.escape-hatch-*` overlay, panel, form, drop zone, success state, mobile breakpoint. |

Total: ~475 lines, one PR.

---

## Rollout

- Single PR on `feat/quote-redesign` branch.
- Playwright verification before merge.
- No feature flag — the pill is discoverable but non-intrusive; exit-intent is one-shot and gated to step ≥ 2. Low risk.
- Follow-up ticket (separate PR) adds the CRM visual distinction for `submitAction === 'help'` leads.
