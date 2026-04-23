/**
 * ValueProp.js — 3-card value proposition section for the fence quiz landing page.
 */
import React, { useState } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import useMediaQuery from '../useMediaQuery';

const CARDS = [
  {
    title: 'Match Your Needs',
    desc: 'Security, privacy, curb appeal, or pool/HOA compliance — we pinpoint the right system.',
    icon: 'target',
  },
  {
    title: 'See It Installed',
    desc: 'Visualize your fence in our 3D Design Studio before you commit.',
    icon: 'monitor',
  },
  {
    title: 'Know the Cost',
    desc: 'Instant estimate based on your specs — no surprises, no pressure.',
    icon: 'cost',
  },
];

function TargetIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="11" />
      <circle cx="24" cy="24" r="4" />
      <line x1="24" y1="2" x2="24" y2="8" />
      <line x1="24" y1="40" x2="24" y2="46" />
      <line x1="2" y1="24" x2="8" y2="24" />
      <line x1="40" y1="24" x2="46" y2="24" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="40" height="28" rx="3" />
      <line x1="16" y1="42" x2="32" y2="42" />
      <line x1="24" y1="34" x2="24" y2="42" />
      <polyline points="18 20 22 24 30 16" />
    </svg>
  );
}

function CostIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="42" x2="12" y2="22" />
      <line x1="20" y1="42" x2="20" y2="14" />
      <line x1="28" y1="42" x2="28" y2="26" />
      <line x1="36" y1="42" x2="36" y2="10" />
      <circle cx="36" cy="10" r="4" />
    </svg>
  );
}

const ICON_MAP = {
  target: TargetIcon,
  monitor: MonitorIcon,
  cost: CostIcon,
};

const styles = {
  section: {
    padding: '64px 24px',
    background: COLORS.white,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: COLORS.skyBlue,
    marginBottom: 36,
    fontFamily: FONTS.inter,
  },
  grid: {
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 900,
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  card: {
    flex: '1 1 260px',
    maxWidth: 280,
    background: COLORS.white,
    border: '1px solid ' + COLORS.border,
    borderRadius: 12,
    padding: '28px 24px',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.navy,
    margin: '16px 0 8px',
    fontFamily: FONTS.inter,
  },
  cardDesc: {
    fontSize: 15,
    color: '#666',
    lineHeight: 1.5,
    fontFamily: FONTS.inter,
    margin: 0,
  },
};

function Card({ card }) {
  var _useState = useState(false), hovered = _useState[0], setHovered = _useState[1];
  var IconComp = ICON_MAP[card.icon];

  return (
    <div
      style={Object.assign({}, styles.card, hovered ? {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      } : {})}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
    >
      <IconComp />
      <h3 style={styles.cardTitle}>{card.title}</h3>
      <p style={styles.cardDesc}>{card.desc}</p>
    </div>
  );
}

export default function ValueProp() {
  var isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={styles.section}>
      <p style={styles.label}>TAKE THIS QUIZ SO WE CAN HELP YOU WITH</p>
      <div style={Object.assign({}, styles.grid, isMobile ? { flexDirection: 'column', alignItems: 'center' } : {})}>
        {CARDS.map(function (card) {
          return <Card key={card.icon} card={card} />;
        })}
      </div>
    </div>
  );
}
