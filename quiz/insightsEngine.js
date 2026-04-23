/**
 * insightsEngine.js — Personalized insights based on quiz answers.
 */

// ── Insight pool (trigger-based) ─────────────────────────────────────
const INSIGHT_POOL = [
  {
    sourceQ: 'q1',
    trigger: (a) => asArray(a.q1).includes('pool_safety'),
    title: 'Consider pool-code spacing',
    text: 'Pool fences must meet strict spacing requirements. Our panels with flush-bottom rails and narrow picket gaps are designed to satisfy most local pool barrier codes.',
  },
  {
    sourceQ: 'q1',
    trigger: (a) => asArray(a.q1).includes('pet_containment'),
    title: 'Flush-bottom matters for pets',
    text: 'A flush-bottom rail sits tight to the ground, removing the gap that small dogs and diggers exploit. The Haven UAB-200 was purpose-built for this.',
  },
  {
    sourceQ: 'q4',
    trigger: (a) => asArray(a.q4).includes('coastal'),
    title: 'Aluminum thrives in coastal environments',
    text: 'Unlike iron or steel, aluminum won\u2019t rust in salt air. Our ProCoat powder-coated finish adds an extra layer of corrosion resistance\u200a\u2014\u200aideal for waterfront properties.',
  },
  {
    sourceQ: 'q4',
    trigger: (a) => asArray(a.q4).includes('sloped'),
    title: 'Rackable panels follow your terrain',
    text: 'Our panels are engineered to rack (angle) up to 36 inches over an 8-foot section, following slopes without unsightly gaps at the bottom.',
  },
  {
    sourceQ: 'q4',
    trigger: (a) => asArray(a.q4).includes('high_wind'),
    title: 'Aluminum handles wind better than solid fences',
    text: 'Picket-style aluminum panels let wind pass through instead of acting like a sail. This dramatically reduces stress on posts and hardware during storms.',
  },
  {
    sourceQ: 'q5',
    trigger: (a) => a.q5 === 'no' || a.q5 === 'not_sure',
    title: 'Get your property surveyed first',
    text: 'Building a fence on the wrong side of the property line can lead to disputes, fines, or forced removal. A professional survey is a small investment that prevents big headaches.',
  },
  {
    sourceQ: 'q6',
    trigger: (a) => a.q6 === 'no' || a.q6 === 'didnt_know',
    title: 'Check your local permit requirements',
    text: 'Most municipalities require a permit before fence installation. Your local building department can tell you about height limits, setback rules, and application steps.',
  },
  {
    sourceQ: 'q8',
    trigger: (a) => a.q8 === 'decided_aluminum',
    title: 'Aluminum is the right call',
    text: 'You\u2019ve done your homework. Aluminum delivers the look of wrought iron without the rust, maintenance, or weight\u200a\u2014\u200aand it\u2019s 100% recyclable.',
  },
  {
    sourceQ: 'q8',
    trigger: (a) => a.q8 === 'havent_thought' || a.q8 === 'starting',
    title: 'Compare materials before committing',
    text: 'Wood rots. Vinyl yellows. Chain-link sags. Aluminum gives you the strength and elegance of ornamental iron with virtually zero maintenance for decades.',
  },
  {
    sourceQ: 'q9',
    trigger: (a) => a.q9 === 'measured',
    title: 'Your measurements are ready',
    text: 'Having accurate linear footage means you can get precise pricing and avoid over-ordering. You\u2019re ahead of the game.',
  },
  {
    sourceQ: 'q9',
    trigger: (a) => a.q9 === 'need_help' || a.q9 === 'havent_thought',
    title: 'Measure before you quote',
    text: 'Walk your planned fence line with a measuring wheel or use a satellite tool like Google Earth. Accurate footage prevents budget surprises and material waste.',
  },
  {
    sourceQ: 'q10',
    trigger: (a) => a.q10 === 'know_where' || a.q10 === 'some_ideas',
    title: 'Your gate plan is solid',
    text: 'Knowing where you need gates means the design studio can give you a more accurate layout and quote\u200a\u2014\u200aincluding hardware and automation options.',
  },
  {
    sourceQ: 'q3',
    trigger: (a) => a.q3 === 'commercial' || a.q3 === 'industrial_gov',
    title: 'Commercial-grade systems available',
    text: 'Our Pro Spacing and Vanguard lines are engineered for commercial and government projects\u200a\u2014\u200atighter picket spacing, heavier wall thickness, and crash-rated options.',
  },
  {
    sourceQ: 'q1',
    trigger: (a) => asArray(a.q1).includes('hoa_code'),
    title: 'HOA-friendly options',
    text: 'Aluminum fencing is one of the most commonly HOA-approved materials. Grandview offers classic styles and neutral colors that satisfy even the strictest architectural review boards.',
  },
];

// Generic (filler) insights when not enough triggers fire
const GENERIC_INSIGHTS = [
  {
    title: 'Boost your property value',
    text: 'A quality aluminum fence can increase property value by 5-10%, making it one of the best ROI home improvements.',
  },
  {
    title: 'Lifetime warranty included',
    text: 'Grandview Fence systems come with a limited lifetime warranty on materials and finish\u200a\u2014\u200agiving you peace of mind for decades.',
  },
];

// ── Helper ───────────────────────────────────────────────────────────
function asArray(val) {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  return [val];
}

// ── selectInsights ───────────────────────────────────────────────────
/**
 * Pick up to `count` personalized insights based on quiz answers.
 * Never shows more than one insight from the same source question.
 *
 * @param {Object} answers — quiz answers keyed by question id
 * @param {number} count — max insights to return (default 3)
 * @returns {Array<{ title: string, text: string }>}
 */
export function selectInsights(answers, count = 3) {
  const results = [];
  const usedQuestions = new Set();

  // 1. Triggered insights
  for (const insight of INSIGHT_POOL) {
    if (results.length >= count) break;
    if (usedQuestions.has(insight.sourceQ)) continue;

    try {
      if (insight.trigger(answers)) {
        results.push({ title: insight.title, text: insight.text });
        usedQuestions.add(insight.sourceQ);
      }
    } catch (_) {
      // If answers are incomplete, skip gracefully
    }
  }

  // 2. Fill remaining slots with generics
  for (const generic of GENERIC_INSIGHTS) {
    if (results.length >= count) break;
    results.push({ title: generic.title, text: generic.text });
  }

  return results;
}
