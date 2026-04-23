# Mapbox Phase 4 — Calculator Bypass + Guide Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phases 1, 2, 3 shipped. Real draw tool and checkout working in prod.

**Goal:** Ship the "I already know my measurements" form bypass (non-draw path), polish the `/how-to-measure-your-yard` route with real video/article URLs, and close the remaining open TODOs against Ultra's 2026 pricebook.

**Architecture:**
- New route `/quote-builder` (or extend existing entry) with "Skip the map — enter measurements" link
- Calculator form reuses `QuoteStep2_Layout` component with `data._source = 'manual'` (no 5% pad applied)
- Guide page polished with real YouTube embed + article link once Sarah provides URLs
- Ultra spec verifications documented and folded into pricing/UI where needed

**Tech Stack:** Same as prior phases.

**Branch:** `feat/quote-redesign`.

---

## File Structure Overview

### Created
```
CalculatorBypassEntry.js         # form-only quote entry point
tests/calculatorBypass.test.js
e2e/calculator-bypass.spec.js
```

### Modified
```
LandingPage.js                    # add "Skip the map" link
WizardShell.js                    # route drawToolData=null path through calculator bypass
HowToMeasurePage.js               # add YouTube embed + article link when URLs provided
docs/research/how-to-measure-yard-for-fence-guide.md  # final Ultra spec alignment
```

---

## Phase 4.1 — Calculator Bypass

---

### Task 4.1.1: `CalculatorBypassEntry.js` form

**Files:**
- Create: `CalculatorBypassEntry.js`
- Test: `tests/calculatorBypass.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// tests/calculatorBypass.test.js
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import CalculatorBypassEntry from '../CalculatorBypassEntry.js';

describe('CalculatorBypassEntry', () => {
  it('collects linear feet, corners, ends, gates', () => {
    const onComplete = vi.fn();
    const { getByLabelText, getByText } = render(
      <CalculatorBypassEntry onComplete={onComplete} />
    );
    fireEvent.change(getByLabelText(/linear feet/i), { target: { value: '150' } });
    fireEvent.change(getByLabelText(/90° corners/i), { target: { value: '2' } });
    fireEvent.change(getByLabelText(/end posts/i), { target: { value: '2' } });
    fireEvent.click(getByText(/continue to quote/i));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      totalFeet: 150,
      corners: 2,
      ends: 2,
      source: 'manual',
    }));
  });

  it('sets source=manual to skip 5% padding', () => {
    const onComplete = vi.fn();
    const { getByLabelText, getByText } = render(
      <CalculatorBypassEntry onComplete={onComplete} />
    );
    fireEvent.change(getByLabelText(/linear feet/i), { target: { value: '100' } });
    fireEvent.click(getByText(/continue to quote/i));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ source: 'manual' }));
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement**

```javascript
// CalculatorBypassEntry.js
import React, { useState } from 'react';

function CalculatorBypassEntry(props) {
  var linearFtState = useState(100);
  var cornersState = useState(0);
  var endsState = useState(2);
  var gatesState = useState(0);

  function submit() {
    props.onComplete({
      totalFeet: linearFtState[0],
      rawFeet: linearFtState[0],
      corners: cornersState[0],
      ends: endsState[0],
      gates: gatesState[0],
      lines: [],
      slopeAnswer: null,
      epqsOverall: 'unknown',
      epqsConfidence: 'low',
      mapboxSnapshotUrl: null,
      source: 'manual',
    });
  }

  return React.createElement('div', { className: 'calc-bypass' },
    React.createElement('h2', null, 'Enter your measurements'),
    React.createElement('p', null,
      'If you already know your footage, skip the map. You\u2019ll still answer slope and gate details in the next step.'),

    React.createElement('label', null, 'Linear feet',
      React.createElement('input', {
        type: 'number', min: 1, max: 5000,
        'aria-label': 'linear feet',
        value: linearFtState[0],
        onChange: function(e) { linearFtState[1](Number(e.target.value)); },
      })
    ),
    React.createElement('label', null, '90\u00B0 corners',
      React.createElement('input', {
        type: 'number', min: 0, max: 50,
        'aria-label': '90 corners',
        value: cornersState[0],
        onChange: function(e) { cornersState[1](Number(e.target.value)); },
      })
    ),
    React.createElement('label', null, 'End posts',
      React.createElement('input', {
        type: 'number', min: 0, max: 20,
        'aria-label': 'end posts',
        value: endsState[0],
        onChange: function(e) { endsState[1](Number(e.target.value)); },
      })
    ),
    React.createElement('label', null, 'Number of gates',
      React.createElement('input', {
        type: 'number', min: 0, max: 20,
        'aria-label': 'gates',
        value: gatesState[0],
        onChange: function(e) { gatesState[1](Number(e.target.value)); },
      })
    ),
    React.createElement('button', { onClick: submit, className: 'calc-submit' },
      'Continue to quote \u2192'
    )
  );
}

export default CalculatorBypassEntry;
```

- [ ] **Step 4: Verify passes**

- [ ] **Step 5: Commit**

```bash
git add CalculatorBypassEntry.js tests/calculatorBypass.test.js
git commit -m "feat(calc): CalculatorBypassEntry form for 'I already know my measurements' path"
```

---

### Task 4.1.2: Add "Skip the map" link on landing/draw-start

**Files:**
- Modify: `LandingPage.js` (or wherever the draw-tool entry CTA lives)
- Modify: `WizardShell.js`

- [ ] **Step 1: Find the entry CTA**

```bash
grep -nE "Start Quote|Get Quote|Draw my" LandingPage.js WizardShell.js | head
```

- [ ] **Step 2: Add calculator link**

In `LandingPage.js` below the primary CTA:
```javascript
React.createElement('a', {
  href: '/quote?skip=calc',
  className: 'lp-skip-map',
}, 'I already know my measurements \u2192 use the calculator')
```

- [ ] **Step 3: In `WizardShell.js`, read `?skip=calc`**

```javascript
import CalculatorBypassEntry from './CalculatorBypassEntry';

useEffect(function() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('skip') === 'calc') setShowCalcBypass(true);
}, []);

// in render:
showCalcBypass
  ? React.createElement(CalculatorBypassEntry, {
      onComplete: function(data) {
        setDrawToolData(data);
        setShowCalcBypass(false);
        advanceToQuoteStep2();
      },
    })
  : /* normal draw view */
```

- [ ] **Step 4: Commit**

```bash
git add LandingPage.js WizardShell.js
git commit -m "feat(calc): route /quote?skip=calc to CalculatorBypassEntry"
```

---

### Task 4.1.3: E2E calculator bypass

**Files:**
- Create: `e2e/calculator-bypass.spec.js`

- [ ] **Step 1: Write**

```javascript
import { test, expect } from '@playwright/test';

test('calculator bypass enters quote flow with source=manual', async ({ page }) => {
  await page.goto('/quote?skip=calc');
  await page.fill('[aria-label="linear feet"]', '100');
  await page.fill('[aria-label="90 corners"]', '2');
  await page.click('button:has-text("Continue to quote")');

  // Verify we reach QuoteStep2 and that no 5% pad applied
  await expect(page.locator('text=/Layout.*Posts/i')).toBeVisible();

  // Inspect the in-progress quote config: the linearFeet should stay 100, not 105
  // (this requires exposing some state for inspection — simplified here)
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run e2e -- calculator-bypass
git add e2e/calculator-bypass.spec.js
git commit -m "test(e2e): calculator bypass reaches QuoteStep2 with manual source"
```

---

## Phase 4.2 — Guide Page Polish

---

### Task 4.2.1: Embed real YouTube + article URLs

**Files:**
- Modify: `HowToMeasurePage.js`

- [ ] **Step 1: Ask user for URLs**

Tell user:
> "Paste the real YouTube video URL for the slope measurement video, and the article URL if it's separate from the guide page itself. Reply 'none' for either if you want to keep the placeholder."

Wait for response. Accept either a YouTube URL (e.g., `https://youtube.com/watch?v=XXXX`) or video ID.

- [ ] **Step 2: Update `HowToMeasurePage.js`**

Add video embed near the top of the body:
```javascript
const YOUTUBE_ID = 'REPLACE_WITH_ID_OR_NULL'; // set when user provides

// in render:
YOUTUBE_ID ? React.createElement('div', { className: 'htm-video' },
  React.createElement('iframe', {
    width: '100%', height: '400',
    src: 'https://www.youtube.com/embed/' + YOUTUBE_ID,
    title: 'How to measure your yard slope',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    allowFullScreen: true,
  })
) : null,
```

- [ ] **Step 3: Update `SlopePopup.js` help links**

Replace the YouTube placeholder URL in `SlopePopup.js`:
```javascript
React.createElement('a', { href: 'https://youtube.com/watch?v=' + YOUTUBE_ID,
  target: '_blank', rel: 'noopener' },
  '\u{1F4F9} Watch: How to measure your yard slope'),
```

- [ ] **Step 4: Commit**

```bash
git add HowToMeasurePage.js SlopePopup.js
git commit -m "feat(content): embed real YouTube video in slope guide + popup help"
```

---

### Task 4.2.2: Ultra spec alignment

**Files:**
- Modify: `docs/research/how-to-measure-yard-for-fence-guide.md`

- [ ] **Step 1: Apply resolved values from the 2026 pricebook**

The spec resolved these from `docs/ultra-product-specifications.md`:
- Standard: 0-6" per 6' panel (NOT 4" from Ultra FAQ — pricebook wins)
- Rackable: 0-20"
- Heavy Rack: 0-36"

Update the guide's tolerance table (around line 200) to reflect these exact numbers. Remove the "4 inches" caveat that's now known to be a marketing round-down.

- [ ] **Step 2: Remove pre-publish verification notes**

Delete the "Verification Notes" section (lines ~430-454) items that have been resolved:
- Standard rack: 4" vs 6" → resolved
- Post spacing: 72" vs 72.5" → resolved (irrelevant to tool, keep as install-time detail)
- Pet-panel racking halves → preserved as Sarah-TODO but not blocking

- [ ] **Step 3: Replace `[Grandview contact]` placeholder**

Find `[Grandview contact]` and replace with actual contact:
```
Call or email us at sales@grandviewfence.com or (XXX) XXX-XXXX
```
(Placeholders left for user to paste real number.)

- [ ] **Step 4: Commit**

```bash
git add docs/research/how-to-measure-yard-for-fence-guide.md
git commit -m "docs: align slope guide with 2026 Ultra pricebook and resolve verification TODOs"
```

---

### Task 4.2.3: Ultra spec code alignment

**Files:**
- Modify: `QuoteStep2_Layout.js` tier desc strings

- [ ] **Step 1: Confirm RACKING_TIERS reflects pricebook**

In `QuoteStep2_Layout.js:29-33`:
```javascript
var RACKING_TIERS = [
  { id: 'standard',       name: 'Standard',        desc: 'Follow slopes up to 6 inches per panel' },
  { id: 'rackable',       name: 'Rackable',         desc: 'Follow slopes up to 20 inches per panel \u2014 requires double-punched posts' },
  { id: 'heavy-rackable', name: 'Heavy Rackable',   desc: 'Follow slopes up to 36 inches per panel \u2014 requires triple-punched posts' },
];
```

Change `double-punched rails` → `double-punched posts` (pricebook says POSTS are punched, not rails).
Change `double-punched rails` (in heavy row) → `triple-punched posts`.

- [ ] **Step 2: Commit**

```bash
git add QuoteStep2_Layout.js
git commit -m "fix(copy): correct 'rails' → 'posts' in racking tier descriptions per Ultra pricebook"
```

---

## Phase 4.3 — Final Cleanup

---

### Task 4.3.1: Delete `DrawYardView.js`

**Only run this task after 2+ weeks of prod traffic on `USE_MAPBOX_DRAW=true` with zero rollbacks.**

- [ ] **Step 1: Verify flag state**

```bash
grep -n "USE_MAPBOX_DRAW" webpack.config.js WizardShell.js
```
Confirm flag defaults true and no code path switches on it anymore.

- [ ] **Step 2: Delete file**

```bash
git rm DrawYardView.js
```

- [ ] **Step 3: Remove feature flag usage**

In `WizardShell.js`:
```javascript
// before:
var DrawView = USE_MAPBOX ? MapboxDrawView : DrawYardView;
// after:
import MapboxDrawView from './MapboxDrawView';
// just use MapboxDrawView directly
```

In `webpack.config.js`, remove `USE_MAPBOX_DRAW` definition.

- [ ] **Step 4: Run full test suite**

```bash
npm test
npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete DrawYardView and USE_MAPBOX_DRAW feature flag (Mapbox draw now sole path)"
```

---

### Task 4.3.2: Tech debt follow-up issues

**Files:**
- Modify: `TECH_DEBT.md`

- [ ] **Step 1: Strike the closed items**

Edit `TECH_DEBT.md`:
- `DrawYardView.js monolith` → strike (deleted)
- `slopedPostCount` → wired in Phase 1.9.2 via `computeSlopedPostCount` helper (segments[].rackingTier → drawToolData → wizard state → config). Revisit in Phase 3 if per-segment SKU differentiation is needed.
- Confirmed live pricing engine → keep, re-titled "pricingEngine.js vs priceCalculator.js consolidation" as a future task

- [ ] **Step 2: Commit**

```bash
git add TECH_DEBT.md
git commit -m "docs: mark tech debt items closed by Mapbox upgrade"
```

---

## Phase 4 Acceptance

- [ ] Calculator bypass flow works end-to-end.
- [ ] Guide page has real YouTube embed (or placeholder if URLs not yet provided).
- [ ] Guide copy matches Ultra 2026 pricebook.
- [ ] `RACKING_TIERS` copy uses "posts" (not "rails").
- [ ] `DrawYardView.js` deleted (after soak).
- [ ] Zero regressions in Phases 1-3 E2E.
- [ ] `superpowers:code-reviewer` agent approves all Phase 4 commits.
