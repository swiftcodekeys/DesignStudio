/**
 * SystemMatch.js — Full product match card for Tier 1 (Project Ready).
 */
import React, { useState } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import { buildDesignStudioUrl } from '../matchingEngine';
import { ctaClicked } from '../analytics';
import useMediaQuery from '../useMediaQuery';
import { getFenceImage } from '../fenceImages';


// Spec grid item
function SpecItem({ label, value }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: COLORS.textMuted,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontFamily: FONTS.inter,
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: 600,
        color: COLORS.navy,
        fontFamily: FONTS.inter,
      }}>
        {value}
      </div>
    </div>
  );
}

function ActionButton({ children, href, onClick, primary }) {
  var _hover = useState(false), hovered = _hover[0], setHovered = _hover[1];

  var style = {
    display: 'inline-block',
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: primary ? COLORS.white : COLORS.navy,
    background: primary ? COLORS.orange : COLORS.white,
    border: primary ? 'none' : '2px solid ' + (hovered ? COLORS.skyBlue : COLORS.border),
    borderRadius: 12,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: FONTS.inter,
    transition: 'all 0.2s',
    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
  };

  if (href) {
    return (
      <a
        href={href}
        style={style}
        onMouseEnter={function () { setHovered(true); }}
        onMouseLeave={function () { setHovered(false); }}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
    >
      {children}
    </button>
  );
}

export default function SystemMatch({ system, onRetake }) {
  var isMobile = useMediaQuery('(max-width: 768px)');
  var _linkHover = useState(false), linkHovered = _linkHover[0], setLinkHovered = _linkHover[1];
  var studioUrl = buildDesignStudioUrl(system);

  var description = 'The ' + system.name + ' (' + system.series + ') is engineered for strength and style. ' +
    'Built from 6063-T6 aluminum with a ProCoat powder coat finish, ' +
    'this system delivers lasting beauty with virtually zero maintenance.';

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: 20,
      padding: isMobile ? '32px 20px' : '48px 44px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      marginTop: 24,
    }}>
      {/* Section label */}
      <p style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: COLORS.skyBlue,
        margin: '0 0 20px',
        fontFamily: FONTS.inter,
      }}>
        YOUR MATCHED SYSTEM
      </p>

      {/* Flex row: illustration + info */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 32,
        alignItems: isMobile ? 'stretch' : 'flex-start',
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: isMobile ? '100%' : 360,
          height: isMobile ? 220 : 260,
          flexShrink: 0,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#f5f7fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={getFenceImage(system.id)}
            alt={system.name + ' aluminum fence'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          {/* System name */}
          <h3 style={{
            fontSize: 28,
            fontWeight: 800,
            color: COLORS.navy,
            margin: '0 0 4px',
            fontFamily: FONTS.inter,
          }}>
            {system.name}
          </h3>

          {/* Series */}
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: COLORS.skyBlue,
            margin: '0 0 12px',
            fontFamily: FONTS.inter,
          }}>
            {system.series} &middot; {system.subtitle}
          </p>

          {/* Description */}
          <p style={{
            fontSize: 16,
            color: '#666',
            margin: '0 0 20px',
            lineHeight: 1.6,
            fontFamily: FONTS.inter,
          }}>
            {description}
          </p>

          {/* Specs grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 24px',
            marginBottom: 20,
          }}>
            <SpecItem label="Heights" value='36"–72"' />
            <SpecItem label="Material" value="6063-T6 Aluminum" />
            <SpecItem label="Finish" value="ProCoat" />
            <SpecItem label="Warranty" value="Limited Lifetime" />
          </div>

          {/* View details link */}
          <a
            href="#"
            style={{
              fontSize: 15,
              color: COLORS.orange,
              textDecoration: 'none',
              fontWeight: 600,
              fontFamily: FONTS.inter,
              display: 'inline-flex',
              alignItems: 'center',
              gap: linkHovered ? 8 : 5,
              transition: 'gap 0.2s',
            }}
            onMouseEnter={function () { setLinkHovered(true); }}
            onMouseLeave={function () { setLinkHovered(false); }}
            onClick={function () { ctaClicked('view_details', system.name); }}
          >
            {'View full ' + system.name + ' details'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </div>

      {/* "Not quite right?" bar */}
      <div style={{
        marginTop: 32,
        paddingTop: 24,
        borderTop: '1px solid ' + COLORS.border,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 14,
          color: '#999',
          fontFamily: FONTS.inter,
          marginRight: 8,
        }}>
          Not quite right?
        </span>
        <ActionButton href="#" onClick={function () { ctaClicked('browse_all', 'systems'); }}>
          Browse All Systems
        </ActionButton>
        <ActionButton href={studioUrl} onClick={function () { ctaClicked('design_studio', system.name); }}>
          Explore in Design Studio
        </ActionButton>
        <ActionButton onClick={onRetake}>
          Retake Quiz
        </ActionButton>
      </div>
    </div>
  );
}
