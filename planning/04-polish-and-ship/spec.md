# Split 04: Polish & Ship

## Goal
Production-ready polish — loading states, shareable URLs, quote flow integration, performance optimization, and cross-browser/mobile testing. Ship it.

## Context
- **Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- **Depends on:** Split 03 (needs final UI to polish)
- **Website:** grandviewfence.com (quote form destination)

## Scope

### 1. Loading States & Transitions
- Show spinner/skeleton while 3D models load (JSONLoader is async)
- Smooth fade-in when model appears
- Tab switching: subtle transition animation (opacity/slide)
- Flyout panel: already has slide animation from Split 03, tune timing
- Debounce rapid config changes (e.g., clicking through heights quickly) — wait 150ms before triggering buildGate()

### 2. URL State Management
- Encode full configuration in URL hash: `#style=uaf_200&color=black&height=60&arch=s&leaf=2&...`
- On page load: parse URL hash → restore config → render gate
- On config change: update URL hash (replaceState, not pushState — avoid polluting history)
- "Share Configuration" button: copy current URL to clipboard with toast notification
- Handle invalid/partial URL params gracefully (fall back to defaults)

### 3. "Get Quote" Integration
- Quote tab shows full config summary (style name, color name, dimensions, all options)
- "Request a Quote" button options:
  - Option A: Open grandviewfence.com/contact in new tab with config as URL params
  - Option B: Inline form (name, email, phone, message) that emails config to Grandview
- Pre-fill message field with formatted config summary
- Include Grandview phone number and email as alternative contact methods

### 4. Performance Optimization
- **Model caching:** Cache loaded geometries in a Map keyed by model path — avoid re-fetching same .json files
- **Thumbnail lazy loading:** Use `loading="lazy"` on thumbnail images in flyout panels
- **Debounce:** Config changes debounced before triggering expensive buildGate()
- **Material reuse:** Share material instances across meshes with same color (already done via traverse)
- **Dispose cleanup:** When building new gate, properly dispose() old geometries and materials to prevent WebGL memory leaks

### 5. Cross-Browser Testing
- Chrome (primary)
- Firefox
- Safari (WebGL quirks)
- Edge
- Verify: 3D renders, flyout animations, URL state, touch events

### 6. Mobile Testing & Touch Polish
- Touch-friendly tap targets (min 44px)
- Swipe gestures on flyout panels (optional)
- Pinch-to-zoom on 3D viewport (if orbit controls added)
- Test on iOS Safari and Android Chrome
- Verify responsive breakpoints from Split 03

### 7. Accessibility Basics
- Keyboard navigation through tabs and controls
- Focus indicators on interactive elements
- Alt text on thumbnail images
- Semantic HTML (nav, main, section, button)
- Sufficient color contrast (WCAG AA on light theme)

## Validation Criteria
- [ ] Loading spinner shows during model load, fades to gate
- [ ] URL updates on every config change
- [ ] Shared URL restores exact configuration
- [ ] "Get Quote" button sends config to grandviewfence.com
- [ ] No WebGL memory leaks on repeated config changes
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Usable on mobile (iOS + Android)
- [ ] Tab navigation works with keyboard

## Constraints
- Keep bundle size reasonable — no heavy libraries for animations (use CSS transitions)
- URL hash format should be human-readable
- Quote integration must work without backend changes to grandviewfence.com initially (URL params or mailto: fallback)
- Don't break any existing functionality from previous splits

## Dependencies
- **Input from 03:** Complete, functional UI with all controls wired to renderer
- **Output:** Production-ready Grandview Design Studio
