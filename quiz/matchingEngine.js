/**
 * matchingEngine.js — Product matching + readiness scoring for the fence quiz.
 */
import { QUESTIONS } from './quizData';

// ── Product catalog ──────────────────────────────────────────────────
const PRODUCTS = {
  haven:          { id: 'uab_200', name: 'Haven',          series: 'UAB-200', subtitle: 'Flat Top Flush Bottom' },
  charleston:     { id: 'uas_100', name: 'Charleston',     series: 'UAS-100', subtitle: 'Classic Spear Top'     },
  charleston_pro: { id: 'uas_101', name: 'Charleston Pro', series: 'UAS-101', subtitle: 'Pro Spacing Spear Top' },
  horizon:        { id: 'uaf_200', name: 'Horizon',        series: 'UAF-200', subtitle: 'Flat Top'              },
  horizon_pro:    { id: 'uaf_201', name: 'Horizon Pro',    series: 'UAF-201', subtitle: 'Pro Spacing Flat Top'  },
  vanguard:       { id: 'uaf_250', name: 'Vanguard',       series: 'UAF-250', subtitle: 'Anti-Climb Flat Top'   },
  savannah:       { id: 'uas_150', name: 'Savannah',       series: 'UAS-150', subtitle: 'Staggered Spear'       },
  solace:         { id: 'uap_100', name: 'Solace',         series: 'UAP-100', subtitle: 'Privacy Screen'        },
};

// Style → default product key mapping
const STYLE_MAP = {
  flat_top:        'horizon',
  spear_top:       'charleston',
  decorative:      'savannah',
  privacy_screen:  'solace',
  high_security:   'vanguard',
  not_sure:        'horizon',       // safe default
};

// Need → product key mapping (priority order used in needPriority)
const NEED_MAP = {
  pool_safety:      'haven',
  pet_containment:  'haven',
  security:         'vanguard',
  privacy:          'solace',
  hoa_code:         'charleston',
  curb_appeal:      'savannah',
};

// Ordered from highest to lowest priority
const NEED_PRIORITY = [
  'pool_safety',
  'pet_containment',
  'security',
  'privacy',
  'hoa_code',
  'curb_appeal',
];

// Pro-spacing variants for commercial properties
const PRO_VARIANTS = {
  horizon:    'horizon_pro',
  charleston: 'charleston_pro',
};

// ── matchSystem ──────────────────────────────────────────────────────
/**
 * Determine the best-fit Grandview Fence product based on quiz answers.
 * @param {Object} answers — quiz answers keyed by question id
 * @returns {Object} product object { id, name, series, subtitle }
 */
export function matchSystem(answers) {
  const property = answers.q3;
  const style    = answers.q2;
  const needs    = Array.isArray(answers.q1) ? answers.q1 : [];

  // ── Hard overrides ──
  if (property === 'industrial_gov') return PRODUCTS.vanguard;
  if (style === 'high_security')     return PRODUCTS.vanguard;

  // ── Need-based matching (highest-priority need wins) ──
  let matchKey = null;
  for (const need of NEED_PRIORITY) {
    if (needs.includes(need)) {
      matchKey = NEED_MAP[need];
      break;
    }
  }

  // ── Style fallback ──
  if (!matchKey) {
    matchKey = STYLE_MAP[style] || 'horizon';
  }

  // ── Commercial override: prefer Pro spacing ──
  if (property === 'commercial' && PRO_VARIANTS[matchKey]) {
    matchKey = PRO_VARIANTS[matchKey];
  }

  return PRODUCTS[matchKey] || PRODUCTS.horizon;
}

// ── calculateScore ───────────────────────────────────────────────────
/**
 * Calculate readiness score (0-100) from scored-block answers (Q5-Q10).
 * @param {Object} answers — quiz answers keyed by question id
 * @returns {number} clamped 0-100
 */
export function calculateScore(answers) {
  const scoredQuestions = QUESTIONS.filter((q) => q.block === 'scored');
  let raw = 0;

  for (const q of scoredQuestions) {
    const chosen = answers[q.id];
    if (!chosen || !q.options) continue;
    const opt = q.options.find((o) => o.value === chosen);
    if (opt) raw += opt.points || 0;
  }

  return Math.min(raw, 100);
}

// ── buildDesignStudioUrl ─────────────────────────────────────────────
/**
 * Build a URL to launch the design studio pre-configured for the matched system.
 * @param {Object} system — product object from matchSystem
 * @param {string} baseUrl — base path (default '/')
 * @returns {string} URL with query params
 */
export function buildDesignStudioUrl(system, baseUrl = '/') {
  const params = new URLSearchParams({
    style:   system.id,
    height:  '48',
    color:   'black',
    postCap: 'pcf',
    fromQuiz: 'true',
  });
  return `${baseUrl}?${params.toString()}`;
}
