// tierColors.js - Single source of truth for per-segment racking tier colors.
// Both the annotated-drawing legend (legendOverlay.js) and the Quote Builder
// racking breakdown (QuoteStep2_Layout.js) read from this so the dot on the
// breakdown card always matches the paint on the drawing.
//
// If you change a color, both surfaces update together.

export var TIER_COLORS = {
  'standard':   '#e8c547',
  'rackable':   '#4a8db7',
  'heavy-rack': '#c2410c',
  'steps':      '#6b7280',
};
