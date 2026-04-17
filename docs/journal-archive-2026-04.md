================================================================================
JOURNAL — Grandview Design Studio Fence Tool
================================================================================

GIT REMOTE NOTE:
  DesignStudio remote (swiftcodekeys/DesignStudio) uses main branch.
  Always push: git push designstudio main
  Local branch: main (working directory)
  Remote name: designstudio


2026-04-02 — Diagnostic Investigation
──────────────────────────────────────

BUG 1: Extra Pickets Rendering Above Puppy Rail — LEFT OF GATE ONLY
====================================================================

Files involved:
  - FenceRenderer.js:557-561 (gate section finial placement — THE BUG)
  - fenceSpatialConstants.js FENCE_PUPPY_FINIAL_POSITIONS (16 positions)
  - fence_tool/m/6/gpupcl.json (gate section puppy model, X 0.031-1.127)

Root cause (CORRECTED — previous diagnosis was wrong):
  Gate section puppy finials overflow into the adjacent panel's space.

  FenceRenderer.js lines 557-561 place gate section finials using the
  full FENCE_PUPPY_FINIAL_POSITIONS array (16 positions, X 0.0815 to
  1.7485). But the gate section puppy model (gpupcl.json) is only
  1.096m wide (X 0.031 to 1.127) — NOT a full 1.8288m panel.

  Finials 10-15 (at local X = 1.1925, 1.3035, 1.4145, 1.5255, 1.6375,
  1.7485) are placed BEYOND the gate section geometry, overflowing into
  world Z range 4.939 to 5.495.

  Panel poArr[4] (z=4.9911) — which is RIGHT of the gate in world Z —
  starts at world Z 5.022. The overflow finials land right at its near
  edge, appearing as extra picket-like geometry on that panel.

  Due to the front yard camera angle (position -7.05, 1.42, -1.85 with
  rotation.y=-120°), panel poArr[4] appears to the LEFT of the gate
  on screen. This is why Sarah sees "extra pickets left of the gate."

What was ruled out:
  - Gate geometry does NOT overlap adjacent panels (0.152m gap, clean)
  - No gap-fill, connector, or bridge geometry exists
  - All panels get identical geometry from placeMeshes (no index logic)
  - FenceRenderer and GateRenderer never run simultaneously
  - No shared materials or clip planes between renderers

What a fix would require:
  Use a separate, shorter finial position array for the gate section
  that only covers positions within the gate model's X range [0.031 to
  1.127]. Approximately the first 10 of 16 positions (X <= 1.0815).
  Filter FENCE_PUPPY_FINIAL_POSITIONS to exclude entries with X > 1.127.

Fix applied (commit 1c68e74):
  Added `if (fp[0] > 1.127) return;` to the gate section finial loop
  at FenceRenderer.js line 558. Filters out finial positions beyond
  the gate model's X extent. One line change.

  Verified: Classic Spear and Staggered Quad-Finial — no overflow
  finials on the panel left of the gate in either variant.

Reproduction (before fix):
  1. Open Design Studio, Front Yard view
  2. Pick Horizon (or any puppy-eligible style)
  3. Go to Puppy tab, select any Classic variant (Classic Spear, etc.)
  4. Look at the panel that appears LEFT of the gate on screen
  5. Extra finials visible above the puppy rail on that panel only


BUG 2: Quote Form Not Receiving Data from Fence Builder / Draw Tool
===================================================================

Files involved:
  - app.js:159-161 (handleGetQuote — opens QuoteModal)
  - app.js:163-190 (handleOpenQuoteBuilder — pre-fills QuoteBuilder)
  - app.js:253 (QuoteModal receives config — THE PRIMARY BUG)
  - app.js:242-243 (FloatingPanel correctly switches config — shows the
    pattern that QuoteModal should follow)
  - QuoteModal.js:80 (buildConfigSummary reads config)
  - QuoteModal.js:4-33 (buildConfigSummary uses gate-specific lookups)
  - QuoteBuilder.js:133-179 (GPS draw data import — manual, not auto)
  - QuoteTab.js:45-46 (both buttons route to handleGetQuote)
  - DrawYardView.js:573-604 (handleGetQuoteForLayout saves to localStorage)
  - TopNav.js:59 (Get Quote button calls onGetQuote)

Root cause:
  PRIMARY — app.js line 253:
    <QuoteModal ... config={config} ... />

  QuoteModal ALWAYS receives the gate `config` object, never `fenceConfig`.
  When the user is on the fencing/backyard tab, they configure fenceConfig,
  but the modal is hardcoded to show gate config. Compare with line 242:
    config={(activeTab === 'fencing' || activeTab === 'backyard') ? fenceConfig : config}

  FloatingPanel already uses the correct pattern. QuoteModal does not.

  SECONDARY — app.js lines 163-190 (handleOpenQuoteBuilder):
  1. Only transfers 3 fields (style, height, color) out of ~10+ config fields.
     Missing: postCap, finialType, pupType, accessories, privacy options.
  2. Color ID mapping may not match FENCE_COLORS numeric IDs.
  3. Style ID mapping is hardcoded and may miss fence-specific styles.
  4. When coming from Draw tool (activeTab === 'draw'), isFenceMode = false,
     so it picks gate config instead of fence config.

  TERTIARY — QuoteModal.js buildConfigSummary (lines 4-33):
  Uses gate-specific lookup tables (FENCE_STYLES, ARCH_STYLES, POST_CAPS,
  FINIALS from configData.js). Even if fenceConfig were passed, the function
  wouldn't resolve fence-specific style IDs against fenceConfigData.js.

  QUATERNARY — QuoteBuilder.js GPS import (lines 133-179):
  The GPS draw data is saved to localStorage under 'gv_draw_layout', but the
  QuoteBuilder requires the user to manually click "Use This Layout" on Step 2.
  The button is not visible on Step 0 (Project) where the QuoteBuilder opens.
  The import is not automatic.

Data flow diagram:

  [FloatingPanel QuoteTab] --"Get Instant Quote"--> handleGetQuote()
       |                                                |
       v                                                v
  [TopNav "Get Quote"]  ----onGetQuote()------>  setQuoteModalOpen(true)
                                                        |
                                                        v
                                               [QuoteModal config={config}]
                                                   ^^^ ALWAYS GATE CONFIG
                                                        |
                                               "build your quote step by step"
                                                        |
                                                        v
                                               handleOpenQuoteBuilder()
                                               - picks gate/fence config ✓
                                               - only transfers 3 fields ✗
                                               - saves to localStorage
                                                        |
                                                        v
                                               [QuoteBuilder]
                                               - reads localStorage
                                               - GPS data needs manual import

  [DrawYardView] --"Get Quote for Layout"--> handleOpenQuoteBuilder()
                                             ^^^ isFenceMode=false (activeTab='draw')
                                             saves GPS layout to localStorage
                                             QuoteBuilder opens at Step 0
                                             GPS banner only visible at Step 2

Reproduction:
  1. Open Design Studio, select Front Yard
  2. Configure a fence: pick Horizon style, White color, 60" height
  3. Go to Puppy tab, select Classic Spear
  4. Click "Get Quote" in the nav bar (or "Get Instant Quote" in Quote tab)
  5. QuoteModal opens — shows gate config (wrong style, wrong color, etc.)
  6. Click "build your quote step by step" — QuoteBuilder opens
  7. Only style/height/color are pre-filled, all other selections are lost

  For Draw tool:
  1. Click "Draw Your Yard" tab
  2. Draw a fence layout
  3. Click "Get Quote for This Layout"
  4. QuoteBuilder opens at Step 0 — no fence config visible
  5. User must advance to Step 2 and manually click "Use This Layout"

What a fix would require:
  1. app.js line 253: Change config={config} to use the same ternary as
     FloatingPanel (line 242):
       config={(activeTab === 'fencing' || activeTab === 'backyard') ? fenceConfig : config}
  2. QuoteModal.js buildConfigSummary: Add fence-mode awareness — import
     FENCE_TOOL_STYLES and FENCE_COLORS from fenceConfigData.js, and use
     them when config has fence-specific shape.
  3. handleOpenQuoteBuilder: Transfer all config fields, not just 3.
     Add: postCap, finialType, pupType, accessories, privacy options.
  4. handleOpenQuoteBuilder: When activeTab === 'draw', set isFenceMode
     based on what the draw tool was configuring (always fence).
  5. QuoteBuilder GPS import: Auto-apply GPS data when opening from
     the Draw tool, or at least open on Step 2 (Layout) instead of Step 0.
  6. Pass an isFence prop to QuoteModal so it knows which lookup tables
     to use for the config summary.

Questions before fixing:
  - Should the QuoteModal show the fence config summary in fence mode, or
    should it just be a pass-through to QuoteBuilder?
  - Is the QuoteBuilder meant to be the primary quote path (replacing the
    modal), or are both paths needed?
  - Should GPS draw data auto-import or require manual confirmation?
  - Should the "Get Instant Quote" and "Request Custom Quote" buttons in
    QuoteTab do different things, or is it intentional that both open the
    same QuoteModal?


2026-04-04 — UX Audit + Conditional Logic Research Session
══════════════════════════════════════════════════════════════

Scope: Full UX audit of wizard flow + price book data extraction +
       conditional logic spreadsheet + UX redesign proposal.

RESEARCH COMPLETED:
  1. Read Ultra price book (May 2025) data via QUOTE_ENGINE_SPEC.md
     - Full product matrix: 7 residential styles + Defender + Privacy
     - Panel pricing for all grades (Residential/Commercial/Industrial)
     - Post pricing by size/wall thickness/length
     - Gate pricing: Walk (W suffix) and Double Drive (D suffix)
     - Hardware pricing: hinges, latches, drop rods
     - Shipping rates by state
  2. Read "Changes to Price Book" PDF errata document
     - 10 price corrections across walk gates and double drive gates
     - Privacy gate pricing table (UAE-ALGW-DS30U pattern)
  3. Read generate-order-form.js — documented all 11 sections / 54 fields
     of Ultra Easy Order Form v3.3
  4. Read all wizard components in correct repo (fence-tool):
     - app.js, FloatingPanel.js, QuoteBuilder.js, QuoteModal.js
     - WizardShell.js (newer multi-zone wizard approach)
     - DrawYardView.js (GPS map drawing with Haversine calculation)
     - configData.js (12 gate styles), fenceConfigData.js (9 fence styles)
     - All 7 tab components
  5. Read existing UX-Research-Summary.md (already in repo)
  6. Read QUOTE_ENGINE_SPEC.md (full pricing + calculation spec)
  7. Read QUOTE_FUNNEL_SPEC.md (funnel audit + recommendations)

FINDINGS — CRITICAL ISSUES:
  1. GPS disclaimer: NONE exists. DrawYardView shows raw footage with
     no accuracy warning. 3-5 meter GPS error = 10% material error.
  2. mailto: submission: Both QuoteModal and QuoteBuilder use window
     .location.href = mailto:. Silently fails without email client.
  3. Gate hardware: Not captured in any flow. Hinge type ($29-$290),
     latch type ($44-$162) missing. D&D hardware is NOT ProCoat matched.
  4. Rackability: Not explained. Terrain dropdown exists but not
     connected to racking implications or post surcharges.
  5. Multi-zone disconnect: WizardShell saves to localStorage keys
     that QuoteBuilder never reads. User work is lost.
  6. Haven/Defender height enforcement: Haven shows invalid heights
     in some flows. Defender not limited to 84/96.
  7. Skip button broken: Routes to QuoteModal instead of QuoteBuilder
     layout step for manual footage entry.
  8. Dual config system: configData.js and fenceConfigData.js maintain
     separate product definitions that can drift.
  9. No real-time pricing: User never sees a price estimate until
     after submitting contact info, despite pricing data being available.
  10. Color name errors: "Textured Beige" (should be Khaki) and
      "Hartford Green" (not approved) in QuoteBuilder.

Easy Order Form gap analysis:
  - 15 of 54 fields fully captured (28%)
  - 12 partially captured (22%)
  - 27 not captured (50%)
  - Most gaps are auto-derivable (grade, post specs, rail count)
  - True UI gaps: gate hardware, grade selection, special notes

FILES CREATED:
  1. C:\Users\sarah\Desktop\DESIGN_STUDIO_CONDITIONAL_LOGIC.xlsx
     - 7 sheets: Product Master, Height Matrix, Color Matrix,
       Picket Tops, Gate Options, Easy Order Form Map, UX Issues
     - 20 UX issues documented with severity + recommended fixes
  2. C:\Users\sarah\Desktop\DESIGN_STUDIO_UX_REDESIGN_PROPOSAL.md
     - Section 1: 10 current state problems with file/line references
     - Section 2: Solutions for multi-zone, GPS, gates, rackability
     - Section 3: 5-step proposed wizard flow
     - Section 4: Full TypeScript data model (QuoteRequest interface)
     - Section 5: Implementation priority matrix
     - Appendices: pricing reference, open questions for Amanda

OPEN QUESTIONS FOR AMANDA:
  1. Haven Lite / Haven Plus / Haven Guard — Ultra model numbers?
  2. Cambridge (UAL-100) — still available or discontinued?
  3. Solace / Solace Air / Solace Screen — exact model numbers, heights
  4. Defender — confirm UAD-100, confirm 84/96 ONLY
  5. Silver color — standard or premium (call for pricing)?
  6. Rackability — $25 setup fee still current? Max angle per style?
  7. Privacy gate pricing — same Easy Order Form workflow?

NOTE: Price book PDFs are image-based but pdf2json was able to extract
text elements (165K chars from 72 pages). Full extraction saved to:
  C:\Users\sarah\Desktop\PRICE_BOOK_3_26_EXTRACTED.md

2026-04-05 — QUOTE_ENGINE_SPEC.md Price Update
══════════════════════════════════════════════════

Updated QUOTE_ENGINE_SPEC.md from May 2025 prices to March 2026 prices.
Source: Ultra_Fence_Privacy_PriceBook_3_26LR_Digital.pdf + errata.

Key price changes (March 2026 vs May 2025):
  - Residential panels: +15-29% across all styles/heights
  - Posts: +15% across all sizes
  - LokkLatch: $43.75 → $58.50 (+34%)
  - MagnaLatch: $162.00 → $186.50 (+15%)
  - Standard Hinge: $29.00 → $33.50 (+16%)
  - TRUClose: $83.00 → $95.50 (+15%)
  - LokkLatch Deluxe: $133.00 → $175.00 (+32%)
  - Drop Rod: $34.00 → $39.25 (+15%)
  - Finials (quad/tri): $8.75 → $10.25 (+17%)
  - Circles: $11.00 → $12.75 (+16%)
  - Ball Cap 2.5": $25.25 → $29.00 (+15%)
  - Ultra Adjustable Hinge: $290.00 → $290.00 (unchanged)
  - Puppy picket surcharge: $57.00 (unchanged)

Worked examples recalculated:
  Example A (150LF Horizon 48"): $5,794 → $6,692 (+15.5%)
  Example B (300LF Charleston 60" comm): $25,661 → $29,006 (+13%)

2026-04-05 — pricing.js Updated to March 2026
══════════════════════════════════════════════

Updated grandview-quote-system/shared/pricing.js from May 2025 → March 2026.
Authoritative source: C:\Users\sarah\Downloads\ULTRA_PRICEBOOK_MARCH2026_PARSED (1).md

Changes made:
  - All residential panel prices (standard + pro, 12 styles)
  - All commercial panel prices (6 styles)
  - All industrial panel prices (6 styles)
  - Defender UAD-100 + UAD-101 prices
  - All post prices (2x2, 2.5x2.5, 3x3, 4x4)
  - All residential walk gate prices (standard + pro, 6 style groups)
  - All accessories (caps, finials, circles, butterflies, scrolls)
  - All hardware (hinges, latches, drop rod, EAK)
  - All rails, flanges, misc items
  - Added industrial TRUClose ($131.75), commercial Ultra hinge ($333.50)
  - Added freight thresholds and Michigan freight rate
  - Added Pro style mappings (savannah-pro, eclipse-pro, etc.)
  - Fixed pool compliance in QUOTE_ENGINE_SPEC (spear styles NOT pool compliant)
  - Fixed Haven variant documentation (Lite/Plus/Guard = config options, not SKUs)
  - Confirmed Cambridge/UAL-100 NOT in March 2026 price book — likely discontinued
  - Easy Order Form is v4.0 (not v3.3 as previously assumed)

Cross-check: 16 key prices verified against authoritative parsed doc. All match.

2026-04-05 — Session 2: Draw Tool Upgrades + Design-to-Quote Bridge
════════════════════════════════════════════════════════════════════

DRAW TOOL UPGRADES (merged to main):
  - Google geometry library (computeLength, computeDistanceBetween)
  - MaxZoomService caps satellite zoom at native imagery
  - Right-click removes last point
  - Guided measuring UI: toolbar, checklist, slope selectors
  - Gate placement: select type/width/arch → place on map with preview line
  - Multi-colored lines (6-color palette per line)
  - Draggable midpoints (insert new corner by dragging)
  - Fixed drag handler stale closure (IIFE capture)
  - Manual segment length override
  - Elevation auto-detect via Google Elevation API
  - Segment-based racking pricing ($4.75/post only on sloped segments)
  - Accuracy disclaimer at top center
  - Buttons moved to top, Finish button added
  - Light blue active button color (#6BA3C2)
  - Undo reverts gate placements (combined snapshots)

DESIGN-TO-QUOTE BRIDGE (on dev, NOT merged):
  - gv_saved_design: captures all 22 config fields + canvas snapshot
  - DesignReviewPage.js: bridge page with snapshot, selections grid,
    address entry, manual footage, contact link, cold start
  - handleOpenQuoteBuilder removed, replaced by handleGetQuote
  - Bridge page CSS (~290 lines)

REMAINING (Tasks 4-11):
  - PoolCompliancePopup.js (two-step pool question)
  - WizardShell gate step reframe (educational, not blocking)
  - QuoteBuilder pre-fill from gv_saved_design + remove needsGates
  - AreaReturnPage.js (multi-area Front + Backyard)
  - Wire multi-area flow into app.js
  - Wire pool popup into backyard flow
  - Auto-persist fence configs to localStorage
  - Fix puppy picket bug in buildQuoteConfig (line 62)

SPEC: docs/superpowers/specs/2026-04-05-design-to-quote-bridge-design.md
PLAN: docs/superpowers/plans/2026-04-05-design-to-quote-bridge.md


2026-04-16 — Admin App Crash + Review Page Fixes + Quiz Hosting Discussion
══════════════════════════════════════════════════════════════════════════

SESSION CONTEXT
  - Branch: feat/quote-redesign (in sync with origin)
  - Deploy targets:
      · Design Studio    → designstudio-csy.pages.dev / studio.grandviewfence.com
      · Admin CRM UI     → grandview-admin.pages.dev
      · CRM Worker + D1  → grandview-crm.sarah-13a.workers.dev (D1: grandview-crm)
  - Last commits reviewed: 6b38563, 2af1ea0, a07d258

POOL COMPLIANCE — PRICE BOOK RECONCILIATION
  User recollection: "4 pool styles + 4 more that can be made pool"
  Parsed doc (ULTRA_PRICEBOOK_MARCH2026_PARSED.md line 147) claimed only 3
  Ultra SKUs qualify (UAF-200, UAB-200, UAF-250). That is an INTERPRETATION
  lifted from ultrafence.com/poolfences.html marketing page.

  Raw Easy Order Form v4.0 (page 1-11 / PAGE 14 of pricebook_main.txt) has:
    "Standard Bottom   A   B (upcharge)   Flush Bottom"
    "Does Fence Need to Comply with BOCA Code for Pools?"
  This is a GENERIC form. Customer writes STYLE NUMBER in Box 10, checks
  A or B in Box 4. Flush bottom is a config option on any style, not a
  separate product. User's recollection is correct — parsed summary is wrong.

  Working interpretation for Bug 1 (pool filter):
    - 4 pool-recommended (flush standard): Haven, Haven Lite, Haven Plus, Haven Guard
    - 4 pool-capable with flush-bottom upgrade: Horizon Pro, Vanguard Pro,
      plus spear-top candidates (Charleston/Savannah/Lexington/Eclipse at 54"+)
    - Hide only Defender (poolCompliance: 'none')
    - Height filter: 48" allowed on 2-rail flush configs (Haven, Haven Lite);
      54"+ required on 3-rail/spear-top pool builds
  NOT YET IMPLEMENTED — awaiting final style list confirmation from user.

SEED SCRIPT FOR FAKE CRM LEADS
  Added scripts/seed-fake-leads.js. POSTs 4 varied leads to /leads:
    #5 Amanda Reyes      — Haven 48" pool backyard             — $7,607.25
    #6 David Kowalski    — Charleston 60" back + front         — $14,609.50
    #7 Priya Patel       — Horizon back + front + drive gate   — $14,858.50
    #8 Marcus Johnson    — Vanguard 12' drive gate only        — $4,005.00
  All returned 201 Created. Commit: 5df0928 chore: seed script for fake CRM leads
  Pushed to origin/feat/quote-redesign.

BUG FOUND — ADMIN APP CRASHES ON LEAD CLICK
  Root cause: schema mismatch between wizard payload and admin reader.
    · Wizard items:  { sku, qty, unit, desc, price, total }
    · Admin expects: { name, qty, retailEach }
    · PricingEngine.jsx:43  fmt(item.retailEach) → undefined.toFixed(2) THROWS
    · Error bubbles past the map, whole QuoteDetail fails to render
  Related latent mismatches (don't crash, return 0 / NaN):
    · ZoneCard.jsx:14         items.reduce((s, it) => s + (it.retailEach * it.qty), 0)
    · QuoteDetail.jsx:421     retail += (it.retailEach || 0) * (it.qty || 0)

  FIX APPLIED (admin-app — NOT git-tracked yet):
    · PricingEngine.jsx
        - fmt() coerces non-finite → 0
        - New normalizeItem() reads item.retailEach ?? item.price ?? 0 and
          name || desc || sku
    · ZoneCard.jsx
        - Same coercion via itemRetail() helper
    · QuoteDetail.jsx
        - Safe fmt() + Number() coercion in MultiZoneQuote totals

  BUILD + DEPLOY:
    npm run build   (vite build → dist/)
    npx wrangler pages deploy dist --project-name grandview-admin
    Live at: grandview-admin.pages.dev (preview: ed47ef1d.grandview-admin.pages.dev)

  TODO: initialize grandview-quote-system as a git repo and commit the fix.
        Currently that directory reports: "fatal: your current branch 'master'
        does not have any commits yet".

PO NUMBER FORMAT CHANGED
  Old: GV-NNNN (sequential from 2601, counter in po_counters table)
  New: LASTNAME-001, LASTNAME-002 per customer last name
  Logic: extract last word of lead.name, uppercase, strip non-A-Z, count
  existing po_number LIKE 'LASTNAME-%', next = count + 1, zero-pad to 3 digits.

  Files changed:
    · worker/src/index.js handleGeneratePO — rewrote to query by prefix
    · admin-app/src/components/POGenerator.jsx — format hint text
    · admin-app/src/utils/api.js — mock PO uses MOCK-001 style

  DEPLOY:
    worker:    npx wrangler deploy (Version: fd61bff0-314d-42c8-811e-b860d548b2dd)
    admin UI:  npx wrangler pages deploy dist --project-name grandview-admin

DESIGN REVIEW PAGE FIXES (fence-tool repo, feat/quote-redesign)
  Reported: "review page not taking me to quote and cant scroll need the
             itemized price quote"
  Also console warning (non-blocking):
    THREE.WebGLRenderer: image is not power of two (1160x1096). Resized to 1024x1024

  FIXES APPLIED (NOT YET COMMITTED):
    1. Scroll — inline style={{ overflowY: 'auto' }} on .bridge-page wrapper.
       Parent .wizard-shell has overflow:hidden + height:100vh. The existing
       CSS rule .wizard-shell .bridge-page { overflow-y: auto; flex: 1 } was
       being defeated by .bridge-page--compact { min-height: 0 } specificity.
    2. "Continue to Full Quote →" primary CTA button. Orange (#D4753A), full
       width, calls onNavigateToManual (goes to step 4 QuoteBuilder). Before,
       the only in-wizard path to quote was a secondary "Enter Footage
       Manually" card on the right column — easy to miss.
    3. Itemized price estimate table (left column, under selections):
         - Panel price (by style ultraModel + height, from PANEL_PRICING)
         - Post price (DEFAULT_POST_SPEC, from POST_PRICING)
         - Per linear foot estimate = (panel + post) ÷ panelWidthFt
         - Note: gates/hardware/shipping in next step
       New helper estimatePricing(saved) reads from retailPricing.js.
       New CSS block added to styles.css after .bridge-contact-phone.

  Three.js warning: cosmetic (auto-resize). Low priority. To suppress, pad
  any non-POT source texture/snapshot to the nearest power-of-two on export,
  or set renderer.capabilities.isWebGL2 path to avoid the warning.

  Dev server still running (background task bv1u4b1jj). Verified webpack
  build: compiled successfully.

QUIZ HOSTING — DISCUSSION (NO CODE YET)
  User request: host fence quiz on CF at quiz.grandviewfence.com, mirror
  studio.grandviewfence.com setup. Auto-populate quiz selections into the
  wizard when the user chooses "turn this into a quote."

  Correction to user's mental model:
    · CF Pages preview branches ARE publicly reachable. "Hosted on its own
      branch" = URL like feat-quiz.project.pages.dev — not indexed but
      discoverable. Branch-based deploy gives isolation, NOT privacy.
    · localStorage does NOT cross subdomains. quiz.grandviewfence.com and
      studio.grandviewfence.com are separate origins for storage purposes.
      Handoff must be via URL params, domain-scoped cookies, or a backend.

  Three options considered:
    A. Two CF Pages projects, SAME fence-tool repo:
         - designstudio project → studio domain
         - grandview-quiz project → quiz domain (needs build:quiz npm script
           + webpack.quiz.config.js that only bundles /quiz entry)
         - Both deploy on push to main
         - Separate privacy controls per project
         - Smaller bundles per deploy
    B. Two repos:
         - fence-tool → studio
         - fence-quiz (standalone, already exists) → quiz
         - Pro: simplest deploy config
         - Con: duplicate components/styles/data between repos
    C. Single bundle, subdomain routing via CF Worker:
         - REJECTED — both apps ship in same bundle, no privacy gain.

  Handoff strategies evaluated:
    1. URL token on navigation (recommended):
         quiz "Get Quote" → studio.grandviewfence.com/wizard?q=<base64 of
         {styleId, height, color, poolBarrier, puppy}> → wizard decodes and
         prefills wizardState. Survives refresh, shareable as a link.
    2. Optional redundancy: POST quiz results to CRM worker (/quiz endpoint)
       so leads are captured even without click-through. Adds analytics.
    3. Cookie on .grandviewfence.com — rejected, blocked by tracking-prevention
       in Safari/Firefox.

  RECOMMENDED: Option A + URL-token handoff.
    - Keeps product data and images in one repo (no drift)
    - Separate deploy lifecycle, bundle size, privacy per CF project
    - URL token is the most robust cross-origin handoff

  OPEN QUESTIONS (awaiting user answer before any code change):
    1. Option A, B, or a variant?
    2. DNS setup for quiz.grandviewfence.com — which registrar/DNS host?
    3. Should the quiz CF project allow preview branches, or production-only
       builds (main-only, no public preview URLs)?
    4. Handoff richness — should wizard SKIP the 3D configurator after a
       quiz handoff (go straight to QuoteBuilder), or still render the 3D
       preview of the picked style so the customer sees it before quoting?

PENDING WORK (not started; task list active)
  #1 Bug 5: Fix duplicate address entry in draw tool (blocks scroll-through)
  #2 Bug 4: Save page shows all zones, not just last
  #3 Bug 1: Pool compliance filters style + height in wizard
  #4 Bug 2: Fix zone flow — per-zone draw + inherit prompt
  #5 Bug 3: Separate driveway gate flow, move to last

UNCOMMITTED CHANGES AT END OF SESSION
  fence-tool:
    · DesignReviewPage.js  — imports + estimatePricing + pricing section + CTA
    · styles.css           — .bridge-pricing* + .bridge-quote-cta
  grandview-quote-system (NOT a git repo yet):
    · admin-app/src/components/PricingEngine.jsx — normalizeItem() + safe fmt()
    · admin-app/src/components/ZoneCard.jsx      — itemRetail() + safe fmt()
    · admin-app/src/components/QuoteDetail.jsx   — safe fmt() + Number coerce
    · admin-app/src/components/POGenerator.jsx   — format hint text
    · admin-app/src/utils/api.js                 — mock PO format
    · worker/src/index.js                        — handleGeneratePO rewrite
  Admin app and worker are deployed (live) but source is untracked.
  Fence-tool changes are local only — not yet committed to feat/quote-redesign.


2026-04-16 — TASK 1: Fix duplicate address entry in Draw Tool (Bug 5)
════════════════════════════════════════════════════════════════════════

PROBLEM
  After entering an address in the wizard (DesignReviewPage step 3), the
  Draw Tool mounted with its own AddressEntry overlay — forcing the user
  to type the address a second time before the map would render.

ROOT CAUSE
  DrawYardView.js:1533 initialized location state as `useState(null)`.
  The wizard flow writes the geocoded address to
    localStorage['gv_bridge_location'] = { address, lat, lng }
  (DesignReviewPage.js:176, WizardShell.js:911) and sets
    localStorage['gv_start_scene'] = 'draw'
  before navigating to /studio. app.js:194-198 consumes gv_start_scene
  to auto-switch to the draw tab, but DrawYardView never read
  gv_bridge_location — so the overlay at line 1763 ( if (!location) )
  short-circuited BEFORE the map.

FIX APPLIED (DrawYardView.js:1533-1548)
  Replaced null init with a lazy initializer that hydrates from
  localStorage['gv_bridge_location']:
    useState(function() {
      try {
        var saved = localStorage.getItem('gv_bridge_location');
        if (saved) {
          var loc = JSON.parse(saved);
          if (loc && typeof loc.lat === 'number' &&
              typeof loc.lng === 'number' && loc.address) {
            return loc;
          }
        }
      } catch (e) {}
      return null;
    });
  Guards on typeof lat/lng/address mean malformed values fall back to
  null, keeping AddressEntry as a safety net.

VERIFICATION (evidence, not assertion)
  - npx webpack --mode development → compiled successfully in 6186 ms
  - Local serve on :5173 (SPA mode), Playwright-driven browser:
      (a) localStorage set with {address, lat, lng} + gv_start_scene='draw',
          navigated /studio
            · .draw-address-overlay  : NOT present
            · .draw-container        : present
            · body text showed satellite map disclaimer
            → MAP LOADS IMMEDIATELY, no re-entry. PASS.
      (b) localStorage cleared, navigated /studio?tab=draw (bypasses
          DesignReviewPage):
            · .draw-address-overlay  : present
            · .draw-address-input    : present
            → Fallback AddressEntry still works. PASS.
  - Console: 0 errors in both paths.

FILES CHANGED
  DesignStudio: DrawYardView.js (one useState initializer, ~14 lines)

NOT TOUCHED (per user scope directive received mid-task)
  No terrain, slope, rackability, or post-calculation logic modified.

COMMIT
  (see next commit on feat/quote-redesign)

REMAINING IN BUG-FIX BATCH (awaiting go-ahead per user instruction)
  Task 2  Pool compliance: smart defaults (no hiding)  — DONE (see below)
  Task 3  Live per-LF price estimate                    — DONE (see below)
  Task 4  3D snapshot in review + quote form             — DONE (see below)
  Task 5  Escape hatch modal on every wizard step
  Task 6  Zone flow — per-zone draw + inherit prompt
  Task 7  Driveway gate mini-flow (separate, last)
  Task 8  Build + deploy + live smoke test


2026-04-16 — TASK 4: 3D snapshot surfaced on review, quote form, and summary
═══════════════════════════════════════════════════════════════════════

PROBLEM
  The canvas snapshot was already captured by WizardShell and stored
  on gv_saved_design.snapshotDataUrl. But:
    - no separate gv_design_snapshot key (spec called for one)
    - QuoteBuilder hero scrolled out of view while user answered questions
    - ZoneQuoteSummary (final confirmation) didn't show the snapshot at all

FIX APPLIED
  WizardShell.js:captureSnapshot()
    - On each "Looks good, next →" click the dataUrl is also written to
      localStorage['gv_design_snapshot'] so downstream consumers can
      read it directly. Original gv_saved_design.snapshotDataUrl is
      preserved for compatibility.

  styles.css
    - .bridge-snapshot-img  min-height: 280px  (Task 4 acceptance)
    - .qb-snapshot-header    position: sticky; top: 0  on desktop
        * On mobile (max-width 768px) overridden to position: static
          so the form isn't crowded on small screens.
    - New .summary-snapshot / .summary-snapshot-img block.

  ZoneQuoteSummary.js
    - Reads localStorage['gv_design_snapshot'] (fallback to
      gv_saved_design.snapshotDataUrl). If present, renders an image
      between the page header and the zone cards.

VERIFICATION (Playwright)
  Full wizard walk (Backyard → No pool → Looks good, next):
    - localStorage['gv_design_snapshot']       → 309,231 chars JPEG data URL
    - DesignReviewPage bridge-snapshot-img     → rendered at 302 × 536 px
      (min-height 280 satisfied; 16:9 aspect preserved)
    - QuoteBuilder .qb-snapshot-header:
        position: sticky, top: 0px
        img.src starts with "data:"  (live snapshot, not placeholder)
  Build: webpack compiled successfully in 4511 ms, 0 errors.
  Console: 0 errors (one pre-existing Three.js warning unrelated).

FILES CHANGED
  WizardShell.js          (+7 lines — extra localStorage write)
  ZoneQuoteSummary.js     (+15 lines — snapshot read + render)
  styles.css              (+12 lines: sticky + summary-snapshot +
                           min-height + mobile override)

NOTE ON MOBILE "COLLAPSIBLE"
  Spec says "On mobile: show at top, collapsible." Implemented "show
  at top" via static positioning on ≤768px; explicit collapse toggle
  UI is not added — user can scroll past and it naturally leaves
  viewport. If an explicit collapse control is needed, it's a small
  follow-up (toggle state + chevron button).


2026-04-16 — TASK 3: Live per-LF price estimate
═══════════════════════════════════════════════════════════════════════

PROBLEM
  Users configured style/height/color without ever seeing a price
  until they submitted contact info. The Review step had a full
  subtotal from calculateZoneQuote but no prominent per-LF rate and
  no explicit ±15% range.

FIX APPLIED
  retailPricing.js
    - New export: estimatePerFootRange(data).
        Input:  { style, height, spacing, grade }
        Output: { ultraModel, panelPrice, postPrice, panelWidthFt,
                  mid, low, high }  (low/high = mid × 1 ± 0.15)
        Honors Pro spacing (swaps to ultraModelPro when available)
        and grade (appends -C / -I to ultraModel).

  QuoteStep1_Style.js
    - Imports estimatePerFootRange.
    - Appends a live estimate block to the config panel:
        "Estimated: $LOW–$HIGH per linear foot"
        "Gates, posts & shipping calculated in your quote"
      Skipped for Privacy fenceType, and when estimate returns null.

  QuoteStep6_Review.js
    - Imports estimatePerFootRange.
    - Appends a per-LF + total-range block right under the existing
      subtotal:
        · "Estimated per linear foot: $LOW–$HIGH"
        · (when linearFeet > 0) "Estimated range for N ft of fence:
          $totalLow–$totalHigh"
        · "Final pricing confirmed in your full quote."
    - Existing items table + subtotal unchanged.

  styles.css
    - New blocks: .qs1-estimate / .qs1-estimate-range /
                  .qs1-estimate-note
                  .qb-review-estimate* (3 classes)

VERIFICATION (evidence, via Playwright, full wizard)
  Style step live updates (confirmed one style/height change per row):
    Horizon    54"  →  $30–$41 per LF  (panel $162 + post $49.35)
    Horizon    72"  →  $30–$40
    Haven      72"  →  $22–$29  (falls back to 48" panel; no 72" SKU)
    Haven      48"  →  $28–$38  (panel $153 + post $49.35)
    Charleston 60"  →  $31–$42  (panel $171.50 + post $49.35)
  All recomputed without page reload.

  Review page:
    Charleston 60" + 150 LF →
       "Estimated per linear foot: $31–$42"
       "Estimated range for 150 ft of fence: $4,693–$6,349"
       "Final pricing confirmed in your full quote."
    Subtotal $5,570.60 (from calculateZoneQuote) falls within range.

  Build: webpack compiled successfully in 3880 ms, 0 errors.
  Console: 0 errors during flow.

FILES CHANGED
  retailPricing.js     (+54 lines, new estimatePerFootRange export)
  QuoteStep1_Style.js  (+20 lines, import + live-range block)
  QuoteStep6_Review.js (+30 lines, import + review estimate block)
  styles.css           (2 new CSS blocks)

NOT TOUCHED (per scope directive)
  No terrain/slope/rackability/post-calculation questions added.
  Post-price gaps in the 72" residential bucket (missing post length
  96" in .060 wall) cause that one combination to show panel-only
  pricing — noted as a separate data issue, not Task 3 scope.


2026-04-16 — TASK 2: Pool compliance smart defaults (warn, don't wall)
═══════════════════════════════════════════════════════════════════════

PROBLEM
  When poolCompliance.poolBarrier was true, QuoteStep1_Style hid all
  non-poolSafe styles (filter at line 122-124) and removed heights
  under 48" from the grid (filter at line 349-353). This blocked users
  instead of guiding them. Spec: "Warn, don't wall."

FIX APPLIED
  QuoteStep1_Style.js
    - Exported new POOL_MIN_HEIGHT_BY_STYLE map:
        haven family         → 48"
        horizon / vanguard   → 54"
        charleston / spear   → 60"
        (defender intentionally absent — flagged "not recommended")
    - Removed poolSafe style filter. All styles now visible in pool mode.
    - Removed height-grid filter. All heights visible; warning instead.
    - Banner text updated: "Pool code compliance auto-configured"
      (was: "showing pool-safe styles only").
    - Per-style badges in pool mode:
        haven family         → green "POOL READY"
        other pool-capable   → gray "POOL CONFIGURABLE"
        defender             → red "NOT RECOMMENDED FOR POOLS"
    - Inline note under style grid:
        "Pool code compliance auto-configured. Flush bottom and
         minimum height selected for your style."
    - Yellow warning shown when selected height < style minimum:
        "Heads up — this height may not meet pool code for this style.
         Haven styles are the safest choice at 48". Always verify with
         your local inspector."

  QuoteBuilder.js
    - Imports POOL_MIN_HEIGHT_BY_STYLE.
    - Extended the poolCompliance useEffect to auto-bump height to
      max(current, min-for-style) in addition to forcing flush bottom.
    - Dependency changed to [props.poolCompliance, data.style] so the
      bump fires when the user switches styles under pool mode.
    - Auto-bump only raises the floor; user can manually lower (and
      gets the yellow warning).

  styles.css
    - Added 3 new badge classes:
        .qs1-badge-pool-ready         (green, bold)
        .qs1-badge-pool-configurable  (neutral gray)
        .qs1-badge-pool-warn          (red, bold)

VERIFICATION (evidence, via Playwright against dist :5173, full wizard)
  Flow: /wizard → Backyard → "Yes — configure for pool code" → advance
        through configurator → Design Review → "Continue to Full Quote"
        → QuoteStep1_Style.

  Residential grade, pool mode:
    · 9 styles visible (Haven + 8 pool-capable, no Defender because
      Defender is industrial-grade only)
    · Haven badges: [POOL, POOL READY]           → green
    · Horizon:      [POPULAR, POOL CONFIGURABLE] → neutral
    · Charleston:   [POPULAR, POOL CONFIGURABLE]
    · Vanguard:     [POOL CONFIGURABLE]
    · Eclipse:      [DECORATIVE, POOL CONFIGURABLE]
    · Charleston Pro:[CLASSIC, POOL CONFIGURABLE]
    · Default height: 54" (flat-top min), flush bottom active.

  Auto-bump (click 42", then click Charleston):
    · 42" selected manually → yellow warning text rendered
    · Switched to Charleston → height auto-bumped to 60" (spear min)
    · Warning cleared because 60" ≥ min.

  Industrial grade (switched in same session), pool mode:
    · Defender visible, badges: [SECURITY, NOT RECOMMENDED FOR POOLS]
    · Defender NOT blocked — still clickable.

  Build: webpack compiled successfully in 4030 ms, 0 errors.
  Console: 0 errors during flow (1 benign Three.js texture warning
  elsewhere, unrelated).

FILES CHANGED
  QuoteStep1_Style.js   (~30 lines; map, filters, badges, note, warning)
  QuoteBuilder.js       (~10 lines; import + extended useEffect)
  styles.css            (3 new CSS classes)

NOT TOUCHED (per scope directive)
  No terrain, slope, rackability, or post-calculation code modified.

  Note: the Design Studio's in-configurator styleTab (step 2 of the
  wizard — FloatingPanel-based 3D tool) uses a separate style ID space
  (uaf_200, uab_200, etc.) and was NOT modified. Task 2 spec's style
  IDs (horizon, haven, charleston, etc.) only map to QuoteStep1_Style.
  If the step-2 configurator also needs pool-guidance badges, that's
  a follow-up item — current Task 2 acceptance criteria all reference
  QuoteStep1_Style behavior.

2026-04-17 — TASK 5: Escape hatch modal on every wizard step
═══════════════════════════════════════════════════════════════════════

PROBLEM
  Users with tricky yards, slope concerns, or who simply ran out of time
  had no low-friction way to reach Grandview from mid-wizard. trackDropoff
  fired silently on beforeunload but captured nothing. Research doc flagged
  sketch/photo upload as a universal competitor pattern.

FIX APPLIED
  EscapeHatchModal.js (new)
    - Unified form: Email (required), Phone, Name, note, optional upload.
    - Client-side JPEG compression to <=900KB (canvas, quality 0.75, max
      1600px long edge). PDFs passed through up to 2MB.
    - Success state with auto-close after 4s.

  useEscapeHatchTriggers.js (new)
    - Desktop mouseleave (clientY <= 0) + mobile visibilitychange.
    - One-shot per session via sessionStorage['gv_escape_fired'].
    - Only active when step >= 2.

  WizardShell.js
    - Two new state hooks, one useEscapeHatchTriggers call.
    - "Need help?" pill added before existing Switch-to-full-configurator.
    - handleEscapeHatchSubmit reuses submitQuoteToCRM payload shape with
      new submitAction='help' + helpNote + helpUploadDataUrl fields.

  analytics.js
    - trackEscapeHatchOpen/Submit/Dismiss.

  wizard.css
    - .wizard-escape-help pill + .escape-hatch-* modal block (~270 lines).

FOLLOW-UP FIXES (same day, surfaced by Playwright smoke tests)
  - useEscapeHatchTriggers.fireOnce() only had a mount-time guard; once
    listeners were attached, every subsequent mouseleave still fired
    onTrigger. Now guards inside fireOnce before setItem.
  - EscapeHatchModal internal state (success, error, upload) never reset
    between opens. Closing via × before the 4s auto-close left the next
    reopen stuck on the "Thanks" success view. WizardShell now
    conditionally renders the modal so it unmounts on close.

VERIFICATION (Playwright, against live dev server + stubbed /leads)
  Pill visible on step 1 and step 2 (same component, no per-step render
    conditions — verified in JSX): PASS.
  Modal opens from pill, title "Stuck? We'll help.", pill subhead
    "Our Michigan team responds within one business day.": PASS.
  Modal closes via × button: PASS.
  Exit-intent on step 2: first mouseleave opens with subhead
    "Before you go — we can pick up where you left off...": PASS.
  Exit-intent second trigger suppressed by session guard: PASS.
  Submit happy path: payload sent with submitAction='help', source=
    'escape-hatch-modal', trigger='pill', wizardStep=1, quoteId=
    'GVH-XXXXXX', Email/Name/Phone, auto-attached zones + snapshot +
    grandTotal from buildQuotePayload. Success state renders
    "Thanks — we'll be in touch." with the reference ID. Auto-close
    after 4s: PASS.
  Submit error path: /leads 500 → red inline banner "Couldn't send —
    please try again or email sales@grandviewfence.com." Send button
    re-enables. Form values preserved: PASS.
  Production build `npm run build`: compiled successfully, zero errors
    (3 pre-existing warnings about bundle + asset size).

FILES CHANGED (Tasks 1-5 + follow-up fix)
  EscapeHatchModal.js         (+~340 new)
  useEscapeHatchTriggers.js   (+~50 new, +4 guard check)
  WizardShell.js              (+~85 edited, including conditional render)
  analytics.js                (+9 new)
  wizard.css                  (+272 new: pill + modal + mobile)

ENDPOINT
  POST /leads at grandview-crm.sarah-13a.workers.dev with
  submitAction='help'. No worker changes, no D1 migrations.

FOLLOW-UP (not in this commit)
  - Admin CRM (grandview-admin.pages.dev) needs a visual badge/filter for
    submitAction='help' leads. Captured via spec line: "Admin CRM follow-up
    (not in this spec's scope)".
  - Modal Send button renders navy in wizard scope (wizard redefines
    --cta locally). Not a bug — spec used var(--cta) faithfully — but
    visually mismatches the orange "Looks good, next →" CTA on the
    wizard's left panel. If the design-system owner wants the modal CTA
    to match the orange wizard CTA, either hoist a dedicated
    --escape-cta token or hardcode the orange.

