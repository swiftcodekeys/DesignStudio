# Phase 4 — Calculator Bypass + Guide Polish Resume Prompt

**Prerequisite: Phases 1, 2, and 3 must be shipped and live.** Phase 4 is the final polish pass — the "I already know my measurements" bypass path plus content polish for `/how-to-measure-your-yard`, plus closing any remaining Ultra pricebook verification TODOs.

## Session Goal

Implement Phase 4 per `docs/superpowers/plans/2026-04-17-mapbox-phase4-calculator-and-polish.md`. Three workstreams:

1. **Calculator bypass** — new route `/quote-builder` (or extend existing entry) with a "Skip the map — enter measurements" link. Reuses `QuoteStep2_Layout` component with `data._source = 'manual'` so the 5% pad is NOT applied. Customer gets panel count based on their exact entered footage.

2. **Guide polish** — `HowToMeasurePage.js` gets a real YouTube embed + article link once Sarah provides URLs. Style the embedded video responsively. Confirm the rendered markdown's images (if any by this point) load from `/assets/slope-guides/`.

3. **Ultra pricebook verification** — close the remaining TODOs against Ultra's 2026 pricebook. Likely small tweaks to `priceData.js` panel/post prices, specific per-accessory prices, privacy surcharge validation. Every change must cite the source (Ultra pricebook PDF page number or scrape).

## Environment

- Working directory: `C:\Users\sarah\Desktop\App Repos\fence-tool`
- Branch: `feat/quote-redesign` (still, per plan)
- HEAD at session start: whatever Phase 3 exits at
- New deps: none expected (may pull in YouTube embed helper if chosen path needs one; prefer native `<iframe>`)
- Test baseline: keeps growing — 53+ vitest, 2+ E2E from Phase 1, new E2E from Phase 2, Phase 3 cross-repo tests

## Plan

`docs/superpowers/plans/2026-04-17-mapbox-phase4-calculator-and-polish.md` — read in full.

## Hard Rules

- Branch `feat/quote-redesign` only until this phase's merge plan executes.
- Never modify the locked Ultra files.
- **No "dogfood" term** — see memory.
- Price changes MUST cite the Ultra pricebook source. Don't eyeball or round. Any unsourced number is rejected.
- Calculator bypass path shares code with draw path — changes to `QuoteStep2_Layout` must still pass both sources (`_source = 'auto'` gets padded, `_source = 'manual'` does not). Add regression tests proving both paths behave as intended.
- User still prefers autonomous execution but pause for: guide URL confirmation (YouTube link, article link), any public-facing copy changes.

## E2E Validation Target

Add `e2e/calculator-bypass.spec.js`:
1. Navigate to landing page.
2. Click "Skip the map — enter measurements" link.
3. Enter 100 linear feet manually.
4. Complete the quote flow.
5. Assert `data._source === 'manual'` (via a debug hook if needed).
6. Assert panel quantity is 17 (NOT 18) — proves pad was NOT applied.
7. Assert subtotal math adds up line-by-line.

All vitest + all E2E specs green before Phase 4 is complete.

## Phase Exit

When Phase 4 is complete with evidence:
1. Merge `feat/quote-redesign` to `main` (PR + review, not a fast-forward).
2. Deploy to production.
3. Flip `USE_MAPBOX_DRAW=true` permanently as the production default.
4. Create a closeout report noting: total commit count, total test count, all 4 phase prompts referenced, any deferred tech debt documented in TECH_DEBT.md.

After merge, Phase 5 planning begins in a separate planning session. Candidate topics (from memory and plan epilogues):
- Mobile drag-to-expand drawer (deferred from Phase 1)
- Per-segment SKU differentiation for racking surcharge (deferred from Phase 1.9.2 commentary)
- Instant estimate on draw (live price updates as user draws, vs. end-of-flow total)
- Contractor wholesale portal (from $5M revenue strategy memory)

Do NOT start Phase 5 without a new plan file and its own resume prompt.
