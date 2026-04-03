# Session Handoff — What's Broken and Needs Fixing

## Date: 2026-04-01

## What Was Done This Session
- Migrated files from Whole tool repo (DrawYardView, QuoteBuilder, QuoteModal, OrbitControls, app.js, FloatingPanel, TopNav, BacklinksFooter, SocialProof, styles.css, tabs)
- Installed @phosphor-icons/react, updated webpack.config.js with DefinePlugin
- Added .env with Google Maps API key, added .env to .gitignore
- Fixed fenceConfigData acc arrays (Charleston Pro, Vanguard, Haven)
- Fixed BacklinksFooter fence URL mappings
- Fixed QuoteBuilder removed nonexistent styles
- Fixed FloatingPanel scroll-spy to use visibleTabs
- Fixed UnifiedCanvas accessories deep comparison
- Fixed quote prefill for fence mode
- Added Solace privacy fence style to fenceConfigData

## STILL BROKEN — Must Fix

### 1. Puppy Pickets Not Rendering on Fence
**Symptoms:** Only standard puppy shows something. Classic variants show nothing different.
**Root cause NOT confirmed.** Multiple attempts to fix without verifying.
**What to do:** 
- Use Playwright to load Ultra's FENCE tool at https://www.ultrafence.com/design-studio/fence/index.html
- Enable puppy pickets (standard, then classic) and scrape the runtime values
- Compare to what FenceRenderer.js does
- The fence tool models ARE in fence_tool/m/6/ (pupst.json, pupcl.json, gpupst.json, gpupcl.json)
- The fence tool JS (ultra_dsf_min.js) was NEVER scraped — only the gate tool JS was
- Console debug logging added: look for `[FenceRenderer] Puppy check:` in browser console

### 2. Solace/Privacy Fence Not Showing in Style Menu
**Symptoms:** Privacy fence card doesn't appear in the fence style picker.
**What was done:** Added to fenceConfigData.js as uap_100 with renderMode:'overlay'. StyleTab filter updated. Bundle verified to contain the code. Thumbnail downloaded to fence_tool/th/th_prv_2ra.jpg.
**Possible causes:**
- Browser cache not clearing (was told to hard refresh but didn't work)
- Maybe the dev server's HMR didn't pick up fenceConfigData changes
- Verify by opening incognito and checking console for errors
- Check: is the style grid rendering 10 cards or 9?

### 3. Color Swatch Orange Hover Not Working on Bronze/White
**Symptoms:** Orange border doesn't show on hover for bronze and white color swatches.
**Root cause:** Inline `style={{ borderColor: ... }}` was overriding CSS :hover rule. 
**Fix attempted:** Removed inline borderColor, added CSS class .swatch-light, added !important to :hover.
**Status:** NOT VERIFIED. May still not work if browser cached old CSS.

### 4. Image Preview Popup Positioning
**Symptoms:** Hover popup appears in the middle of the viewport instead of next to the sidebar card.
**Fix attempted:** Changed ImagePopup.js to use `right: 352px` anchoring instead of left-based positioning.
**Status:** NOT VERIFIED in browser.

### 5. Post Cap Hover Popup Should Be Removed
**Fix attempted:** Removed onMouseEnter/onMouseLeave from post cap cards in DetailsTab.js.
**Status:** NOT VERIFIED.

### 6. Finials "None" Option
**Fix attempted:** Removed deselect-to-null behavior from handleFinialChange in DetailsTab.js.
**Status:** NOT VERIFIED.

## Files Modified This Session
- app.js — routing, quote prefill for fence mode
- FloatingPanel.js — scroll-spy, visibleTabs consistency
- TopNav.js — hamburger menu, onGetQuote
- BacklinksFooter.js — fence URLs, Solace URL
- SocialProof.js — spring sale, hyperlinks, 10s rotation
- UnifiedCanvas.js — PANEL_WIDTH=0, FENCE_TOOL_STYLES import, overlay rendering, accessories comparison
- configData.js — height labels with feet
- fenceConfigData.js — acc arrays, Solace privacy style
- styles.css — navy theme, responsive breakpoints, swatch hover !important, footer compact
- webpack.config.js — DefinePlugin for Google Maps
- FenceRenderer.js — puppy picket logic (BROKEN, needs Playwright verification)
- tabs/StyleTab.js — overlay filter, Solace thumbnail+badge
- tabs/ColorTab.js — privacy colors, swatch-light class
- tabs/DetailsTab.js — fence finials, post cap popup removed, no finial deselect
- tabs/PuppyPicketsTab.js — popup positioning
- tabs/ImagePopup.js — right-anchored positioning
- DrawYardView.js — recenter button fix
- QuoteBuilder.js — removed nonexistent styles
- QuoteModal.js — NEW file
- OrbitControls.js — NEW file (not wired in, shelved for photo feature)
- TODO_COMPREHENSIVE.md — NEW file
- FIX_PLAN.md — NEW file
- .env — NEW file (Google Maps API key)
- .gitignore — added .env

## Key Rule
**DO NOT claim something is fixed without testing it in the browser or with Playwright.** This session failed because fixes were claimed based on code edits alone without runtime verification.

## How to Verify
```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
npm start
# Open localhost:3000 in incognito
# Check: Style grid shows 10 cards (including Solace)
# Check: Color swatches show orange border on hover
# Check: Puppy tab — select Standard, check console for [FenceRenderer] logs
# Check: Post caps — no popup on hover
# Check: Finials — no None/deselect option
```
