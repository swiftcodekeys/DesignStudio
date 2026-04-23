/**
 * LandingHero.js — Sky gradient hero section for the fence quiz landing page.
 */
import React from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import useMediaQuery from '../useMediaQuery';

const styles = {
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #8fbdd4 0%, #a8cede 25%, #c0dae6 50%, #d6e6ee 75%, #e4eef4 100%)',
    paddingTop: 96,
    paddingBottom: 72,
    textAlign: 'center',
  },
  clouds: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px',
  },
  h1: {
    fontSize: 54,
    fontWeight: 900,
    color: COLORS.white,
    letterSpacing: -1.5,
    lineHeight: 1.1,
    margin: 0,
    fontFamily: FONTS.inter,
    textShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  sub: {
    fontSize: 19,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 20,
    lineHeight: 1.5,
    fontFamily: FONTS.inter,
  },
  cta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 36,
    padding: '16px 36px',
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.white,
    background: COLORS.orange,
    border: 'none',
    borderRadius: 28,
    cursor: 'pointer',
    fontFamily: FONTS.inter,
    boxShadow: '0 4px 24px rgba(242,101,34,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  trust: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: 500,
    color: 'rgba(24,42,60,0.6)',
    fontFamily: FONTS.inter,
    letterSpacing: 0.5,
  },
};

export default function LandingHero({ onStart }) {
  var isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={styles.wrapper}>
      {/* Realistic fluffy cloud shapes — matching grandviewfence.com sky theme */}
      <div style={styles.clouds}>
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1400 500">
          {/* Large cloud cluster — left */}
          <g fill="rgba(255,255,255,0.28)">
            <ellipse cx="120" cy="100" rx="120" ry="45" />
            <ellipse cx="200" cy="80" rx="100" ry="55" />
            <ellipse cx="280" cy="95" rx="90" ry="40" />
            <ellipse cx="170" cy="70" rx="70" ry="35" />
          </g>
          {/* Medium cloud — center-left */}
          <g fill="rgba(255,255,255,0.22)">
            <ellipse cx="480" cy="130" rx="100" ry="38" />
            <ellipse cx="540" cy="115" rx="80" ry="45" />
            <ellipse cx="600" cy="128" rx="70" ry="32" />
          </g>
          {/* Large cloud cluster — right */}
          <g fill="rgba(255,255,255,0.25)">
            <ellipse cx="950" cy="90" rx="130" ry="50" />
            <ellipse cx="1050" cy="75" rx="110" ry="55" />
            <ellipse cx="1130" cy="88" rx="90" ry="40" />
            <ellipse cx="1020" cy="65" rx="80" ry="35" />
          </g>
          {/* Small wispy cloud — far right */}
          <g fill="rgba(255,255,255,0.18)">
            <ellipse cx="1300" cy="140" rx="80" ry="30" />
            <ellipse cx="1350" cy="130" rx="60" ry="35" />
          </g>
          {/* Lower subtle cloud */}
          <g fill="rgba(255,255,255,0.12)">
            <ellipse cx="700" cy="320" rx="140" ry="35" />
            <ellipse cx="780" cy="310" rx="100" ry="40" />
          </g>
        </svg>
      </div>

      <div style={styles.content}>
        <h1 style={Object.assign({}, styles.h1, isMobile ? { fontSize: 36 } : {})}>
          See Your Perfect Fence&nbsp;&mdash; Before You Buy
        </h1>
        <p style={Object.assign({}, styles.sub, isMobile ? { fontSize: 16 } : {})}>
          Answer 15 quick questions. We'll match you to the right system and show
          you exactly what it looks like.
        </p>
        <button
          style={styles.cta}
          onClick={onStart}
          onMouseEnter={function (e) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(242,101,34,0.45)';
          }}
          onMouseLeave={function (e) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(242,101,34,0.35)';
          }}
        >
          Start the Quiz
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <p style={styles.trust}>&#10003; Free &nbsp;&nbsp; &#10003; 3 minutes &nbsp;&nbsp; &#10003; Instant results</p>
      </div>
    </div>
  );
}
