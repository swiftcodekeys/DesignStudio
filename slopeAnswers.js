// slopeAnswers.js - Single source of truth for the three slope-answer values
// written into gv_slope_answer by MapboxDrawView's SlopePopup flow.
//
// Both the SlopePopup (which writes) and the Quote Builder Terrain read-only
// summary (which displays) import from here so they cannot drift apart.
//
// If you change a value or add a new one, update both surfaces together.

export var SLOPE_ANSWER_VALUES = ['flat', 'some', 'all'];

export var SLOPE_ANSWER_LABELS = {
  flat: 'Flat yard',
  some: 'Some sections sloped',
  all:  'Mostly sloped yard',
};

// Long-form explainer copy used by SlopePopup's radio options.
export var SLOPE_ANSWER_EXPLAINERS = {
  flat: 'Mostly flat. No panels need racking',
  some: 'Some sections slope. We can mark them',
  all:  'Very sloped throughout',
};
