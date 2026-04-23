/**
 * QuizIcons.js — SVG icons for Block 1 option cards.
 */
import React from 'react';

var ICONS = {
  lock: function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="11" y="23" width="30" height="22" rx="3" />
        <path d="M17 23V17a9 9 0 0 1 18 0v6" />
        <circle cx="26" cy="34" r="3" />
        <line x1="26" y1="37" x2="26" y2="40" />
      </svg>
    );
  },

  shield: function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 6L8 14v12c0 11.2 7.7 21.6 18 24 10.3-2.4 18-12.8 18-24V14L26 6z" />
        <polyline points="20 26 24 30 32 22" />
      </svg>
    );
  },

  grid: function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="10" y1="12" x2="10" y2="40" />
        <line x1="18" y1="12" x2="18" y2="40" />
        <line x1="26" y1="12" x2="26" y2="40" />
        <line x1="34" y1="12" x2="34" y2="40" />
        <line x1="42" y1="12" x2="42" y2="40" />
        <line x1="6" y1="16" x2="46" y2="16" />
        <line x1="6" y1="26" x2="46" y2="26" />
        <line x1="6" y1="36" x2="46" y2="36" />
      </svg>
    );
  },

  sparkle: function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 6l3.5 12.5L42 22l-12.5 3.5L26 38l-3.5-12.5L10 22l12.5-3.5L26 6z" />
        <path d="M38 34l1.5 5.5L45 41l-5.5 1.5L38 48l-1.5-5.5L31 41l5.5-1.5L38 34z" />
      </svg>
    );
  },

  pool: function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 30c4-4 8 0 12-4s8 0 12-4 8 0 12-4" />
        <path d="M6 38c4-4 8 0 12-4s8 0 12-4 8 0 12-4" />
        <path d="M6 46c4-4 8 0 12-4s8 0 12-4 8 0 12-4" />
        <rect x="14" y="8" width="4" height="18" rx="2" />
        <rect x="34" y="8" width="4" height="18" rx="2" />
      </svg>
    );
  },

  pet: function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="16" cy="16" rx="4" ry="5" />
        <ellipse cx="36" cy="16" rx="4" ry="5" />
        <ellipse cx="10" cy="26" rx="3.5" ry="4.5" />
        <ellipse cx="42" cy="26" rx="3.5" ry="4.5" />
        <path d="M18 34c0-6 3-10 8-10s8 4 8 10c0 5-3 10-8 10s-8-5-8-10z" />
      </svg>
    );
  },

  document: function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 6h16l12 12v28a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
        <polyline points="30 6 30 18 42 18" />
        <line x1="20" y1="28" x2="36" y2="28" />
        <line x1="20" y1="34" x2="36" y2="34" />
        <line x1="20" y1="40" x2="28" y2="40" />
      </svg>
    );
  },

  // Aliases matching quizData icon names
  'eye-off': function () {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 26s8-14 20-14 20 14 20 14-8 14-20 14S6 26 6 26z" />
        <circle cx="26" cy="26" r="6" />
        <line x1="8" y1="8" x2="44" y2="44" />
      </svg>
    );
  },

  sparkles: function () {
    return ICONS.sparkle();
  },

  waves: function () {
    return ICONS.pool();
  },

  paw: function () {
    return ICONS.pet();
  },

  clipboard: function () {
    return ICONS.document();
  },
};

/**
 * Get an SVG icon by name. Returns a React element.
 * @param {string} name
 * @returns {React.ReactElement|null}
 */
export function getIcon(name) {
  var iconFn = ICONS[name];
  if (!iconFn) return null;
  return iconFn();
}

export default ICONS;
