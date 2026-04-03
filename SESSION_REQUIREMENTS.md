# Grandview Design Studio — Session Requirements

## Context

You are working on the Grandview Design Studio, a React + Three.js (r86) 3D gate/fence configurator that white-labels Ultra Aluminum Manufacturing's design studio. The working repo is on this machine. Before making ANY rendering or math changes, you must validate against the source tools using Playwright.

---

## What Was Accomplished Last Session

### Renderer Fixes
- Reverted broken dynamic height math from 3792c8e — restored verified hardcoded CLIP_POST and CLIP_PO23 clip constants
- Fixed style change resetting user's color to black (stale closure bug in StyleTab)
- Fixed finial/postCap not persisting in URL hash — spear styles now survive page refresh

### UI Overhaul
- Viewport shifts left when panel open, centers when collapsed
- New 64px nav bar with logo icon + "GRANDVIEW Fence" text + "Design Studio" subtitle
- White transparent logo (logo-white.png), no box/border
- "Fence" colored in sky blue (--brand) matching grandviewfence.com
- Removed white vertical divider, centered nav tabs in window
- Scaled up all nav elements (tabs, buttons, brand text) proportionally
- 10px gap between right-side nav buttons
- Active tab underline uses sky blue
- Next button: white default, orange on hover
- Next button text uses --brand-dark blue (matches Get Quote)
- Back button text darker and more readable
- Replaced Get Quote in backlinks with Pet-Safe link
- Panel capped with max-height so it doesn't stretch on tall viewports
- Backlinks blur always full width across screen
- Backlinks text bigger (13px), darker (--text-primary), single line
- Footer hint: "Complete your design and get instant quote"
- All em dashes replaced with | pipes in UI text
- Background image replaced with new driveway photo (GateBackground.jpg)
- Scene vertically centered in viewport
- Restored ultra_dsg_minbak.js backup

### Social Proof Pill
- 12 rotating messages cycling every 15s with fade animation
- Removed height, removed vague marketing claims
- Added trust signals: veteran-owned, AAMA 2604, pool code compliant, warranty, contractor pricing
- Pill positioned under panel, hidden when collapsed

### iFence Image Scrape + Swap
- Scraped 99 preview images from ifenceusa.com (fence + gate studios)
- Saved to assets/ifence_previews/ in 13 subdirectories
- Replaced all thumbnails across every tab (StyleTab, ColorTab, DetailsTab, PuppyPicketsTab)
- Charleston Pro card: custom image, zoomed/cropped, contrast boosted

---

## THIS SESSION: Priority Fixes

### Critical: Size Tab Is Completely Broken

Nothing in the Size tab works. The following all need to be fixed:

1. **Height selection** — Changing between heights (e.g. 48" / 54" / 60" / 72") does not update the 3D model. The height values, available options per style, and the math behind them must be correct.

2. **Single / Double gate toggle** — Switching between single and double gate does not work. The model must update to show one panel vs two panels with correct proportions.

3. **Direct mount option** — The direct mount toggle/option does nothing. When direct mount is selected, posts should not render (gate mounts directly to structure).

#### VALIDATION REQUIREMENT — DO NOT GUESS THE MATH

Before writing ANY size/dimension logic:

1. **Use Playwright to scrape Ultra Aluminum's live design studio** (https://ultraaluminum.com — find their gate configurator). For each gate style, capture:
   - Available heights
   - Available widths for single vs double
   - How the 3D model changes between sizes
   - Direct mount vs post mount behavior
   - Any dimension constraints or rules

2. **Use Playwright to scrape iFence's live configurator** (https://ifenceusa.com — their gate/fence studio). Cross-reference:
   - Height/width options per style
   - Single vs double gate rendering differences
   - Post behavior in direct mount mode

3. **Document what you find** in a validation file before writing any code. Include screenshots if possible.

4. **Only then** implement the changes, with the scraped data as your source of truth.

5. **After implementing**, run Playwright again to compare your output against both tools visually. Do not call it done until it matches.

---

### Critical: Color Hover Popup Not Showing

The ImagePopup component is wired into ColorTab but does not trigger visually. When a user hovers over a color swatch, a larger preview image should appear (like the iFence behavior). Debug why it's not rendering — likely a positioning, z-index, or state issue. The iFence preview images for colors are already saved in `assets/ifence_previews/`.

---

### UI Tweaks

1. **Fence button** — Currently in the nav. It should NOT be a styled button. Make it a simple text link with a small right-arrow icon. On hover, the arrow should animate slightly to the right (translateX 3-4px, ease transition). White text, no background, no border. It links to grandviewfence.com.

2. **Next button** — Should be orange (solid fill, not just on hover). White text. This is the primary action button — it should look like one.

3. **Back button** — Keep subtle but readable (current darker text is fine).

---

### Known Renderer Bugs (From Last Session — Fix If Time Permits)

- **BUG-1: Charleston center gap** — Remove CENTER_GAP vertex shift from po23 loader
- **BUG-2: Center seam post caps** — pc4/pc5 at x=+/-0.044, no CENTER_GAP push
- **BUG-3: Pro spacing Y position** — ptRes needs own Y offset per style

---

## What Is NOT In Scope This Session

- Dynamic height as a standalone commit (that's a future session)
- Puppy picket finials for classic variants
- Mobile responsiveness
- Get Quote form integration
- PDF download
- Phase 2 (fence tool) or Phase 3 (Google Maps estimator)

---

## Working Rules

1. **Verify before changing** — Use Playwright against Ultra and iFence to validate all dimension math before touching renderer code
2. **One change at a time** — Make a change, verify it works, then move to the next. No batched multi-file commits without checking each.
3. **Don't guess specs** — If you can't find a value from Ultra's tool or iFence, say so. Do not infer dimensions.
4. **Test after every change** — Run the dev server and confirm visually before proceeding.
5. **If something breaks, revert immediately** — Don't try to fix forward on top of a broken change.

---

## File Locations

- Working repo: `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- iFence preview images: `assets/ifence_previews/`
- Background image: `GateBackground.jpg`
- Backup renderer: `ultra_dsg_minbak.js`
- Previous session context: `PROJECT_PROMPT.md` and `CLAUDE.md` in repo root

---

## Constraints

- Three.js r86 (legacy, no module imports)
- React functional components with hooks
- All gate dimension data must be validated against Ultra's live tool before implementation
- White-label of Ultra Aluminum — our tool must produce identical 3D output for matching configurations
