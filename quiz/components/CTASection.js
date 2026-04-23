/**
 * CTASection.js — Tiered call-to-action cards.
 */
import React, { useState, useEffect } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import { buildDesignStudioUrl } from '../matchingEngine';
import { ctaClicked } from '../analytics';
import useMediaQuery from '../useMediaQuery';

var KEYFRAMES_ID = 'quiz-cta-section-keyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  var style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent =
    '@keyframes quizCtaPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(242,101,34,0.4); } 50% { box-shadow: 0 0 20px 4px rgba(242,101,34,0.3); } }';
  document.head.appendChild(style);
}

// Icon SVGs
function QuoteIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="6" y1="8" x2="18" y2="8" />
      <line x1="6" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function DesignIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={COLORS.skyBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={COLORS.skyBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={COLORS.skyBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// Tier-specific CTA content
function getCTAContent(tierLabel) {
  if (tierLabel === 'Project Ready') {
    return {
      primary: {
        icon: <QuoteIcon />,
        title: 'Get Your Instant Quote',
        desc: 'Based on your answers, we can generate a project estimate right now.',
        action: 'Get Quote',
        ctaName: 'instant_quote',
        useStudioUrl: false,
      },
      secondary: {
        icon: <DesignIcon />,
        title: 'Open in Design Studio',
        desc: 'See your matched system in 3D. Customize colors, height, gates.',
        action: 'Open Studio',
        ctaName: 'design_studio',
        useStudioUrl: true,
      },
    };
  }
  if (tierLabel === 'Getting There') {
    return {
      primary: {
        icon: <DesignIcon />,
        title: 'Open in Design Studio',
        desc: 'Your preferences are pre-loaded. See your matched system in 3D.',
        action: 'Open Studio',
        ctaName: 'design_studio',
        useStudioUrl: true,
      },
      secondary: {
        icon: <QuoteIcon />,
        title: 'Get a Quote When Ready',
        desc: "Once you've explored options, request a detailed estimate.",
        action: 'Request Quote',
        ctaName: 'request_quote',
        useStudioUrl: false,
      },
    };
  }
  // Low tier
  return {
    primary: {
      icon: <BookIcon />,
      title: 'Read the Buying Guide',
      desc: 'Everything you need to know about choosing an aluminum fence.',
      action: 'Read Guide',
      ctaName: 'buying_guide',
      useStudioUrl: false,
    },
    secondary: {
      icon: <ExploreIcon />,
      title: 'Explore in Design Studio',
      desc: 'Play with styles, colors, and configurations. No commitment.',
      action: 'Explore',
      ctaName: 'design_studio',
      useStudioUrl: true,
    },
  };
}

function CTACard({ item, isPrimary, studioUrl }) {
  var _hover = useState(false), hovered = _hover[0], setHovered = _hover[1];

  var cardStyle = {
    padding: '32px 28px',
    borderRadius: 16,
    background: isPrimary ? 'rgba(242,101,34,0.12)' : 'rgba(255,255,255,0.06)',
    border: isPrimary ? '1px solid rgba(242,101,34,0.3)' : '1px solid rgba(255,255,255,0.08)',
  };

  var buttonStyle = {
    display: 'inline-block',
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 700,
    color: isPrimary ? COLORS.white : COLORS.white,
    background: isPrimary ? COLORS.orange : 'rgba(255,255,255,0.1)',
    border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.15)',
    borderRadius: 28,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: FONTS.inter,
    transition: 'transform 0.2s, box-shadow 0.2s',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    animation: isPrimary ? 'quizCtaPulse 2s ease-in-out infinite' : 'none',
  };

  var href = item.useStudioUrl ? studioUrl : '#';

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 16 }}>
        {item.icon}
      </div>
      <h4 style={{
        fontSize: 18,
        fontWeight: 700,
        color: COLORS.white,
        margin: '0 0 8px',
        fontFamily: FONTS.inter,
      }}>
        {item.title}
      </h4>
      <p style={{
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        margin: '0 0 20px',
        lineHeight: 1.5,
        fontFamily: FONTS.inter,
      }}>
        {item.desc}
      </p>
      <a
        href={href}
        style={buttonStyle}
        onMouseEnter={function () { setHovered(true); }}
        onMouseLeave={function () { setHovered(false); }}
        onClick={function () { ctaClicked(item.ctaName, href); }}
      >
        {item.action}
      </a>
    </div>
  );
}

export default function CTASection({ tier, system }) {
  var isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(function () {
    injectKeyframes();
  }, []);

  var content = getCTAContent(tier.label);
  var studioUrl = buildDesignStudioUrl(system);

  return (
    <div style={{
      background: COLORS.navy,
      borderRadius: 20,
      padding: isMobile ? '32px 20px' : 48,
      marginTop: 24,
    }}>
      {/* Section label */}
      <p style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: COLORS.skyBlue,
        margin: '0 0 24px',
        fontFamily: FONTS.inter,
      }}>
        YOUR NEXT STEPS
      </p>

      {/* 2-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 20,
      }}>
        <CTACard item={content.primary} isPrimary={true} studioUrl={studioUrl} />
        <CTACard item={content.secondary} isPrimary={false} studioUrl={studioUrl} />
      </div>
    </div>
  );
}
