// optionLabels.js -- Centralized human-readable label maps for Ultra manufacturing codes.
//
// These codes come from the 3D configurator (app.js buildSavedDesign) and must
// survive the full chain: configurator UI -> gv_saved_design -> QuoteBuilder data
// -> sidebar spec list -> Review step. Every code needs a readable label so
// Ultra receives clear manufacturing intent and buyers see plain English.
//
// Import this file in QuoteBuilder.js and QuoteStep6_Review.js.
// Do NOT duplicate these maps locally in those files.

export var POST_CAP_LABELS = {
  pcf: 'Flat Cap',
  pcb: 'Ball Cap',
};

// Ultra finial codes from DetailsTab.js FINIAL_ITEMS (fs/ft/fq/fp)
// AND QuoteStep4_Extras.js slug names (spear/tri/quad/plug).
// Both sets are included so the map works regardless of which entry point
// the buyer used (3D configurator vs QB Extras step directly).
export var FINIAL_LABELS = {
  // Ultra codes (from 3D configurator via gv_saved_design.finialType)
  fs: 'Spear',
  ft: 'Tri-Finial',
  fq: 'Quad-Finial',
  fp: 'Plug',
  // QB Extras slugs (set by QuoteStep4_Extras update({ finialType: ... }))
  spear: 'Spear',
  tri:   'Tri-Finial',
  quad:  'Quad-Finial',
  plug:  'Plug',
  none:  'None',
};

// Puppy picket variant IDs from PuppyPicketsTab.js FENCE_PUPPY_VARIANTS.
// The 3D configurator writes config.pupType and config._pupVariant.
// buildSavedDesign writes pupType (the model: pupst or pupcl).
// The _pupVariant (e.g. pupcl_spe) is the display variant -- map both.
export var PUPPY_TYPE_LABELS = {
  pupfl:     'Flush',
  pupst:     'Standard',
  pupcl:     'Classic',
  // fence variant IDs that include the finial suffix
  pupcl_pls: 'Staggered Plugged',
  pupcl_spe: 'Classic Spear',
  pupcl_sps: 'Staggered Spear',
  pupcl_tri: 'Classic Tri-Finial',
  pupcl_trs: 'Staggered Tri-Finial',
  pupcl_qua: 'Classic Quad-Finial',
  pupcl_qus: 'Staggered Quad-Finial',
  // gate variant IDs from PUPPY_VARIANTS in PuppyPicketsTab.js
  fls: 'Flush',
  std: 'Standard',
  plg: 'Classic Plugged',
  pls: 'Staggered Plugged',
  spe: 'Classic Spear',
  sps: 'Staggered Spear',
  tri: 'Classic Tri-Finial',
  trs: 'Staggered Tri-Finial',
  qua: 'Classic Quad-Finial',
  qus: 'Staggered Quad-Finial',
};

// Gate arch style IDs from OptionsTab.js ARCH_THUMBS and configData.js ARCH_STYLES.
export var ARCH_LABELS = {
  e:  'Estate',
  a:  'Arched',
  r:  'Reverse Arch',
  s:  'Standard',
  // Also used in QuoteStep3_Gates as archTop slugs
  es:       'Estate',
  ar:       'Arched',
  rv:       'Reverse Arch',
  st:       'Standard',
  flat:     'Flat',
  arched:   'Arched',
  estate:   'Estate',
  reverse:  'Reverse Arch',
  standard: 'Standard',
};

// Gate mount type from OptionsTab.js / configData.js
export var MOUNT_LABELS = {
  p: 'Post Mount',
  d: 'Direct Mount',
};

// Gate leaf count from configData.js
export var LEAF_LABELS = {
  '1': 'Single Gate',
  '2': 'Double Gate',
  1:   'Single Gate',
  2:   'Double Gate',
};

// Slope answer values from SlopePopup.js / MapboxDrawView.js gv_slope_answer
export var SLOPE_LABELS = {
  none: 'Flat (no slope)',
  some: 'Some sections sloped',
  all:  'Very sloped throughout',
};
