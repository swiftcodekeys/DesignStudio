# REMAINING FIX PLAN — Priority Order
## Created 2026-04-01 from Ultra research

### Stable checkpoint: `stable-checkpoint-apr1-v2`

---

## FIX A: Finial Thumbnail Images (SAFE — UI only, no rendering)
**Problem:** DetailsTab uses wrong iFence preview images for finials.
**Source of truth:** Ultra's gate_tool/th/ has correct thumbnails:
- `gate_tool/th/th_pc_spe.jpg` — Spear (pointed single tip)
- `gate_tool/th/th_pc_tri.jpg` — Tri-Finial (three-pronged)
- `gate_tool/th/th_pc_qua.jpg` — Quad-Finial (four-pronged)
- `gate_tool/th/th_pc_plg.jpg` — Plug (smooth rounded cap)

**Fix:** Swap FINIAL_ITEMS in DetailsTab.js to use gate_tool/th/ images.
**Also:** Fence finials use single-letter IDs (s/t/q) not gate IDs (fs/ft/fq/fp).
Need separate FINIAL_ITEMS for fence mode.
**Risk:** Zero — only changes thumbnail paths.

## FIX B: Custom Quote Builder Not Loading (SAFE — state routing)
**Problem:** Clicking "Build your quote step by step" in QuoteModal doesn't load QuoteBuilder.
**Root cause:** handleOpenQuoteBuilder sets view='quote-builder' but may fail silently.
**Fix:** Add console logging + error boundary. Check if QuoteBuilder component mounts.
**Risk:** Low — debugging/error handling only.

## FIX C: Fence Finial Config Key Mismatch (SAFE — UI wiring)
**Problem:** DetailsTab sends gate finial IDs (fs/ft/fq) but fence needs (s/t/q).
FenceRenderer checks `config.finialType` for values 's', 't', 'q'.
DetailsTab currently maps: fs=Spear, ft=Trident, fq=Quad, fp=Plug.
Fence needs: s=Spear, t=Tri, q=Quad (no plug on fence).
**Fix:** When isFence=true, use fence finial IDs in DetailsTab.
**Risk:** Low — only changes which string is saved to config.

## FIX D: FenceRenderer Accent Not Rendering (VERIFY FIRST)
**Problem:** Circle/butterfly/scroll may not render on fence despite correct config.
**FenceRenderer code (verified):**
- Lines 423-441: Checks `config.accessories.cir` / `config.accessories.but`
- Loads models from fence_tool/m/8/ (accir.json, acbut.json, acscr.json)
- All model files confirmed present
- Spatial constants match FENCE_SPATIAL_TRUTH.json exactly
**Likely cause:** Config not reaching FenceRenderer because DetailsTab was saving
to wrong keys (gate IDs tcr/tbu instead of fence IDs cir/but).
**Status:** FIX already applied in previous commit (accent ID mapping).
**Verify:** Just test after Fix C is done — may already work.

## FIX E: Fence Render Glitch (COMPLEX — needs careful approach)
**Problem:** Front Yard fence sometimes doesn't render properly.
**Root cause:** Race condition in FenceRenderer._loadEnvMap() — async HDR loading
can be interrupted by buildFence() being called before HDR is ready.
**Ultra reference:** Uses PMREM-processed HDR environment maps exclusively for
realistic look (no directional lights). If env map isn't ready, materials look flat.
**Fix:** Add loading gate — don't call buildFence until env map is loaded.
OR: Use a fallback env map from the previous view while new one loads.
**Risk:** Medium — touches rendering initialization but not spatial math.
**Rule:** DO NOT modify any position/clip/transform math. Only touch the
async loading sequence.

## FIX F: Google Maps Address Search (EXTERNAL DEPENDENCY)
**Problem:** Geocoding returns errors.
**Debug info added:** Console now logs API key, autocomplete status, geocode status.
**User needs to verify:**
1. Open browser console on Draw Your Yard tab
2. Look for `[DrawYard] Maps API key loaded: AIzaSyDw3Yj...`
3. Type an address and look for `[DrawYard] Geocode status: ...`
4. In Google Cloud Console, verify:
   - Geocoding API is ENABLED
   - Places API is ENABLED
   - API key restrictions include localhost:3000
**Cannot fix in code** — this is an API configuration issue.

## FIX G: Puppy Pickets 3-9 Look Same (KNOWN LIMITATION)
**Problem:** All classic puppy variants (spear, tri, quad, staggered) look identical.
**Root cause:** Only 2 puppy model files exist: pupst.json and pupcl.json.
The variant-specific finial models (in m/7/) don't exist yet on Ultra's server.
Comment in code: "All classic variants use pupcl model — finial visual differences
are aspirational until m/7/ puppy finial models become available"
**Fix:** None possible — waiting on Ultra to publish puppy finial models.
**Action:** Add a note in the UI that classic variants share the same base model.

## NOT FIXING (per CLAUDE.md rules):
- FenceRenderer spatial math (positions, clips, transforms)
- GateRenderer buildGate() logic
- SPATIAL_TRUTH.json or FENCE_SPATIAL_TRUTH.json values
- Any Three.js scene construction
These require Playwright verification against Ultra's live tool.

---

## EXECUTION ORDER:
1. Fix A (finial thumbnails) — zero risk
2. Fix C (fence finial IDs) — low risk  
3. Fix B (quote builder debug) — low risk
4. Verify Fix D (fence accents) — just test
5. Fix E (render glitch) — if time permits, careful approach
6. Fix F (Maps) — user verification needed
