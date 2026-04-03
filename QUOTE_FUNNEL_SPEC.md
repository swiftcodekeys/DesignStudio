# Quote Funnel Specification — Grandview Design Studio

**Date:** 2026-04-02
**Repo:** `C:\Users\sarah\Desktop\App Repos\fence-tool`
**Status:** Research + spec — no code changes

---

## 1. Current State Audit

### What Exists (4 Entry Points)

| # | Entry Point | Location | Destination | Works? |
|---|-------------|----------|-------------|--------|
| 1 | TopNav "Get Quote" | `TopNav.js:59` | QuoteModal | Yes |
| 2 | FloatingPanel "Get Instant Quote" | `FloatingPanel.js:144` | QuoteModal | Yes |
| 3 | Draw Tool "Get Quote for This Layout" | `DrawYardView.js:473` | QuoteModal (via `onGetQuote`) | Partial — GPS data saved to localStorage but QuoteModal ignores it |
| 4 | Draw Tool "Skip — I'll enter measurements manually" | `DrawYardView.js:181` | QuoteModal (via `onSkip → onGetQuote`) | Broken — opens config summary modal, not manual entry |

### Two Quote Paths

**Path A — QuoteModal (quick email):** 4 fields (name, email, phone, message) + config summary → mailto: `sales@grandviewfence.com`. Simple, fast, but no footage or project details.

**Path B — QuoteBuilder (multi-step):** 8 steps, 20+ fields, full project spec → mailto: `sales@grandviewfence.com`. Comprehensive but only reachable via a small link in the QuoteModal ("Or build your quote step by step →" at `QuoteModal.js:206`).

### Submission: All mailto:

Both paths use `window.location.href = 'mailto:...'` — no backend API, no webhook, no database. The user's email client opens. If the user doesn't have a desktop email client configured (common on Windows), the quote is lost.

### What's Broken

**1. "Skip — I'll enter measurements manually" goes to the wrong place**
- `DrawYardView.js:529-531`: `handleSkip` calls `onGetQuote()` which opens QuoteModal
- QuoteModal shows the current gate/fence config summary, not a manual footage entry form
- The user who "already knows their footage" needs to land on **QuoteBuilder Step 2 (Layout)** where they can type in their run lengths manually
- **Fix:** `onSkip` should call `handleOpenQuoteBuilder()` instead of `handleGetQuote()`, and QuoteBuilder should open at step index 1 (Layout) instead of step 0

**2. GPS data ignored by QuoteModal**
- `DrawYardView.js:573-604` saves draw data to `localStorage['gv_draw_layout']`
- Then calls `onGetQuote()` → opens QuoteModal
- QuoteModal never reads `gv_draw_layout`. The GPS footage data is invisible.
- Only QuoteBuilder Step 2 (`QuoteBuilder.js:138-170`) detects and imports GPS data
- **Fix:** Either (a) route Draw Tool → QuoteBuilder directly instead of QuoteModal, or (b) show GPS footage summary in QuoteModal

**3. QuoteBuilder only reachable through QuoteModal**
- The "build your quote step by step" link (`QuoteModal.js:206`) is the ONLY path to QuoteBuilder
- No direct entry from TopNav, FloatingPanel, or Draw Tool
- **Fix:** Add a direct route to QuoteBuilder, or make it the primary path

**4. Config pre-fill only transfers 3 fields**
- `app.js:163-190` (`handleOpenQuoteBuilder`) only maps style, height, color
- Missing: postCap, finial, picketSpacing, accessories, puppy type, privacy options
- **Fix:** Transfer all config fields in the mapping

---

## 2. Industry Research Findings

### What Top Competitors Do

| Company | Quote Flow | Key Insight |
|---------|-----------|-------------|
| **GreatFence.com** | Real-time pricing in configurator + separate detailed quote form | Price anchoring during config reduces form abandonment |
| **WamBam Fence** | Single-page form, ~12 fields in 3 sections, sketch upload, 4.5-star reviews sidebar | Social proof adjacent to form improves conversion |
| **Lowe's / Home Depot** | Online calculators for estimates → funnel to in-home consultation | Big box can't offer instant quotes — Grandview's advantage |

### Conversion Best Practices

1. **Pre-fill everything from the configurator session.** The quote form should feel like a summary confirmation, not starting over. (Source: Smashing Magazine configurator UX)

2. **3-5 steps max.** Progress indicators boost completion 20-30%. Empire Flippers saw 51.6% conversion increase with optimized multi-step forms. (Source: Responsify)

3. **Contact info goes LAST.** Phone number fields cause the highest abandonment. Put low-commitment fields first (project type, footage), contact info after the user is invested. (Source: Conversion Rate Experts)

4. **Trust signals near CTA buttons** increase conversions 42% for first-time visitors. Must-haves: star ratings, BBB badge, SDVOSB/veteran-owned, AAMA 2604, warranty details, real phone number. (Source: CrazyEgg)

5. **63% of home improvement traffic is mobile.** Pages must load under 3 seconds. Click-to-call, dropdowns over text input, session save for later. (Source: Invoca, ArcSite)

6. **Offer a "fast path" for users who already know specs.** Direct quote form with dropdowns (style, height, color, footage, gates) alongside the visual builder. Both paths converge at the same quote summary. (Source: DriveWorks, Vervaunt)

7. **Map-based measurement is optional enhancement, not requirement.** Always allow manual footage entry as fallback. (Source: Spring Fence Pros)

---

## 3. Recommended Funnel Architecture

### Principles
- **One primary CTA** ("Get My Quote") that adapts based on context
- **Two paths to the same destination** — configurator users and "I know what I want" users both arrive at a quote summary
- **Progressive disclosure** — only ask what we don't already know
- **No mailto:** — use a backend endpoint or at minimum a form-to-email service (Formspree, EmailJS, or Grandview's existing contact form handler)

### Proposed 5-Step Quote Funnel

```
STEP 1: Project Overview
  - What are you fencing? (backyard / pool / front / full / commercial)
  - Do you need gate(s)? (yes/no)
  - ZIP code
  [Pre-filled if coming from quiz: projectType, zip]

STEP 2: Your Layout
  - How do you know your measurements?
    → "I drew it on the map" [auto-import GPS data from localStorage]
    → "I measured it myself" [manual entry: runs + lengths + terrain]
    → "I need help measuring" [show Draw Your Yard CTA or request site visit]
  - Number of corners
  - Total footage (calculated, shown prominently)
  [Pre-filled if coming from Draw Tool or configurator]

STEP 3: Style & Options (SKIP if coming from configurator)
  - Fence style (card grid with thumbnails)
  - Height / Color
  - Picket spacing (standard vs puppy)
  - Post cap / finials / accessories
  [Pre-filled from configurator — show as editable summary instead of picker]

STEP 4: Review + Contact
  - Visual summary card (style thumbnail + all specs + total footage)
  - Trust signals sidebar (veteran-owned, AAMA 2604, warranty, reviews)
  - Name (required)
  - Email (required)
  - Phone (optional but encouraged — "for fastest response")
  - Preferred contact method (email / phone / text)
  - Additional notes (textarea)
  - "Get My Quote" CTA button (orange, prominent)

STEP 5: Confirmation
  - Quote reference ID (GV-XXXXXX)
  - "We'll email your detailed quote within 1 business day"
  - Phone: (855) FENCE-30
  - "Browse fence styles while you wait" [link back to configurator]
  - Option to download PDF summary (future)
```

### Smart Routing Logic

```
IF user comes from Design Studio configurator:
  → Pre-fill Steps 1+3 from config
  → Skip to Step 2 (Layout) if footage unknown
  → Skip to Step 4 (Review) if footage IS known (from Draw Tool)

IF user comes from Draw Tool with GPS data:
  → Pre-fill Steps 1+2 from GPS data
  → Start at Step 3 (Style)

IF user comes from Quiz with "I've measured" answer:
  → Start at Step 2 (Layout) with manual entry focused

IF user clicks "I already know my footage" from anywhere:
  → Start at Step 2 (Layout) with manual entry focused

IF user clicks TopNav "Get Quote" cold (no prior config):
  → Start at Step 1 (Project)
```

### Entry Points (Revised)

| Entry Point | New Behavior | Destination |
|-------------|-------------|-------------|
| TopNav "Get Quote" | Direct to QuoteBuilder | Step 1 (cold) or Step 4 (if config exists) |
| FloatingPanel "Get Instant Quote" | Direct to QuoteBuilder with config pre-filled | Step 2 or Step 4 |
| Draw Tool "Get Quote for Layout" | Direct to QuoteBuilder with GPS pre-filled | Step 3 |
| Draw Tool "Skip — manual entry" | Direct to QuoteBuilder | Step 2 (Layout, manual entry) |
| Quiz result "Open Design Studio" | Open configurator with quiz answers pre-filled | Configurator |
| Quiz result "Get Quote Now" (NEW) | Direct to QuoteBuilder with quiz answers | Step 1 |

---

## 4. "I Already Know My Footage" — Diagnosis & Fix

### Current Broken Flow

```
User clicks "Skip — I'll enter measurements manually"
  → DrawYardView.js:181 → onClick={onSkip}
  → DrawYardView.js:529: handleSkip = () => onGetQuote()
  → app.js:159: handleGetQuote = () => setQuoteModalOpen(true)
  → QuoteModal opens showing gate/fence config summary
  → User sees style/color/arch — NOT a footage entry form
  → Dead end unless user finds "Or build your quote step by step" link
```

### Why It Breaks

1. **Wrong destination:** `onSkip` routes to `handleGetQuote()` (QuoteModal) instead of `handleOpenQuoteBuilder()` (QuoteBuilder)
2. **Wrong starting step:** Even if it reached QuoteBuilder, it would open at Step 0 (Project), not Step 1 (Layout) where manual footage entry lives
3. **No "startAtStep" prop:** QuoteBuilder always starts at step 0. There's no mechanism to jump to a specific step on mount.

### What a Fix Requires

**Minimal fix (3 changes):**

1. `DrawYardView.js:529-531` — Change `handleSkip` to call a new prop `onSkipToManualEntry` instead of `onGetQuote`
2. `app.js` — Add `handleSkipToManualEntry` function that calls `handleOpenQuoteBuilder()` and passes a `startStep` param
3. `QuoteBuilder.js:574` — Accept `initialStep` prop: `useState(props.initialStep || 0)`

**Better fix (recommended):**

Eliminate QuoteModal as an intermediate step entirely. All "Get Quote" actions should go directly to QuoteBuilder with context-aware pre-fill and smart starting step. QuoteModal becomes unnecessary once QuoteBuilder has a clean Step 4 (Review + Contact) that serves as the "quick quote" path.

---

## 5. Submission Backend Recommendation

### Problem with mailto:

- Doesn't work if user has no desktop email client (WebMail-only users, many Windows setups)
- No confirmation that the email was actually sent
- No data capture if user closes the email client
- No analytics on quote funnel completion

### Recommended: Form-to-Email Service

**Option A — Formspree (simplest):**
```javascript
fetch('https://formspree.io/f/{form_id}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteData)
});
```
Free tier: 50 submissions/month. Paid: $10/mo unlimited. Sends to sales@grandviewfence.com.

**Option B — EmailJS (no backend):**
Similar to Formspree. Free tier: 200 emails/month.

**Option C — Grandview website contact form:**
If grandviewfence.com already has a contact form with a backend handler (WordPress, etc.), POST to that same endpoint with the quote data as hidden fields. This is the most integrated option.

**Option D — Google Apps Script (free, unlimited):**
Deploy a Google Apps Script that receives POST data, writes to a Google Sheet, and sends a formatted email to sales@grandviewfence.com. Free, no rate limits for reasonable volume.

---

## 6. Trust Signals to Display During Quote Funnel

Already available in the app (`SocialProof.js` rotates these):

- SDVOSB / Service-Disabled Veteran-Owned
- Woman-Owned Small Business
- AAMA 2604 Certified Coatings
- Pool Code Compliant (BOCA)
- Lifetime Structural Warranty
- ProCoat Powder Coat Finish
- Michigan-Based / Made in USA

**Recommendation:** Show 3-4 of these as static badges alongside the quote form on Steps 4 and 5, not as a rotating pill. Static badges build more trust than animated ones. Add: star rating (if available), response time guarantee ("Quote within 1 business day"), and real phone number.

---

## 7. Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Fix "Skip" button to route to QuoteBuilder Step 2 | 30 min | Unblocks manual footage path |
| P0 | Add `initialStep` prop to QuoteBuilder | 15 min | Enables smart routing |
| P1 | Route all "Get Quote" CTAs directly to QuoteBuilder (bypass QuoteModal) | 2 hrs | Eliminates dead-end modal |
| P1 | Transfer all config fields in `handleOpenQuoteBuilder` (not just 3) | 1 hr | Users don't lose their design choices |
| P1 | Auto-import GPS data when QuoteBuilder opens from Draw Tool | 30 min | Eliminates manual "Use This Layout" click |
| P2 | Consolidate 8 steps → 5 steps per this spec | 4 hrs | Reduces abandonment |
| P2 | Replace mailto: with form-to-email service | 2 hrs | Reliable submission |
| P2 | Add trust signal badges to quote form | 1 hr | Conversion lift |
| P3 | Add "Get Quote Now" CTA to quiz results page | 1 hr | New conversion path |
| P3 | PDF download of quote summary | 4 hrs | Professional touch |
| P3 | Add real-time pricing estimates | 8+ hrs | Biggest conversion driver — requires pricing data |
