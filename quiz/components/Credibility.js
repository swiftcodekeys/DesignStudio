/**
 * Credibility.js — Dark navy credibility section for the fence quiz landing page.
 */
import React from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';

function VeteranIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function EngineeredIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="15" y1="14" x2="15" y2="14.01" />
      <rect x="9" y="18" width="6" height="4" />
    </svg>
  );
}

var BADGES = [
  { icon: VeteranIcon, text: 'Veteran-Owned' },
  { icon: BuildingIcon, text: 'Residential \u00b7 Commercial \u00b7 Government' },
  { icon: EngineeredIcon, text: 'Made in the USA' },
];

var styles = {
  section: {
    background: COLORS.navy,
    padding: '56px 24px',
    textAlign: 'center',
  },
  inner: {
    maxWidth: 720,
    margin: '0 auto',
  },
  stat: {
    fontSize: 28,
    fontStyle: 'italic',
    color: COLORS.orange,
    fontFamily: FONTS.notoSerif,
    margin: 0,
    lineHeight: 1.4,
  },
  source: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
    fontFamily: FONTS.inter,
  },
  copy: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    marginTop: 24,
    fontFamily: FONTS.inter,
  },
  badges: {
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
    marginTop: 36,
    flexWrap: 'wrap',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: FONTS.inter,
  },
};

export default function Credibility() {
  return (
    <div style={styles.section}>
      <div style={styles.inner}>
        <p style={styles.stat}>
          74% of homeowners regret a renovation decision.
        </p>
        <p style={styles.source}>
          &mdash; Clever Real Estate, 2024 Home Renovation Survey
        </p>
        <p style={styles.copy}>
          Wrong material. Wrong style. Wrong supplier. We built this assessment
          so your fence isn't one of them.
        </p>
        <div style={styles.badges}>
          {BADGES.map(function (b) {
            var Icon = b.icon;
            return (
              <div key={b.text} style={styles.badge}>
                <Icon />
                <span style={styles.badgeText}>{b.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
