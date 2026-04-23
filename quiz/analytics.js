/**
 * analytics.js — Analytics event stubs for the fence quiz.
 * All functions log to console for now; swap in real analytics later.
 */

/**
 * Generic event tracker.
 * @param {string} event — event name
 * @param {Object} [data] — optional payload
 */
export function trackEvent(event, data = {}) {
  console.log(`[Quiz Analytics] ${event}`, data);
}

export function quizStarted() {
  trackEvent('quiz_started');
}

export function questionAnswered(questionId, answer) {
  trackEvent('question_answered', { questionId, answer });
}

export function quizCompleted(score, tier, systemName) {
  trackEvent('quiz_completed', { score, tier, systemName });
}

export function emailSubmitted(tier, hasPhone) {
  trackEvent('email_submitted', { tier, hasPhone });
}

export function resultsViewed(matchedSystem, score) {
  trackEvent('results_viewed', { matchedSystem, score });
}

export function ctaClicked(ctaName, destination) {
  trackEvent('cta_clicked', { ctaName, destination });
}

export function backlinkClicked(source) {
  trackEvent('backlink_clicked', { source });
}
