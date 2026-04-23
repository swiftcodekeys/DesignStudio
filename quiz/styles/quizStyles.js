/**
 * quizStyles.js — Shared style constants for the fence quiz.
 */

export const COLORS = {
  skyBlue:     '#78afcf',
  skyLight:    '#9dc5db',
  skyLighter:  '#c4dde9',
  skyLightest: '#e8f1f5',
  navy:        '#182a3c',
  orange:      '#f26522',
  orangeGlow:  'rgba(242,101,34,0.3)',
  white:       '#ffffff',
  bg:          '#f5f7fa',
  text:        '#171717',
  textMuted:   '#999999',
  textDark:    '#333333',
  border:      '#ebebeb',
  green:       '#22c55e',
  greenBg:     'rgba(74,222,128,0.12)',
  yellow:      '#facc15',
  yellowBg:    'rgba(250,204,21,0.15)',
  pink:        '#f472b6',
  pinkBg:      'rgba(244,114,182,0.12)',
  blueBg:      'rgba(120,175,207,0.15)',
};

export const FONTS = {
  inter:     "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  notoSerif: "'Noto Serif', Georgia, serif",
};

export const TIER = {
  HIGH: { min: 75, label: 'Project Ready',  color: COLORS.green,  bg: COLORS.greenBg  },
  MID:  { min: 40, label: 'Getting There',  color: COLORS.yellow, bg: COLORS.yellowBg  },
  LOW:  { min: 0,  label: 'Early Explorer',  color: COLORS.pink,   bg: COLORS.pinkBg   },
};

/**
 * Return the tier object that matches a given readiness score.
 * @param {number} score — 0-100
 * @returns {{ min: number, label: string, color: string, bg: string }}
 */
export function getTier(score) {
  if (score >= TIER.HIGH.min) return TIER.HIGH;
  if (score >= TIER.MID.min)  return TIER.MID;
  return TIER.LOW;
}
