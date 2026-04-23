/**
 * SystemSuggest.js — Light suggestion card for Tier 2 & 3.
 */
import React, { useState } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import { buildDesignStudioUrl } from '../matchingEngine';
import { ctaClicked } from '../analytics';
import { getFenceImage } from '../fenceImages';


function TintButton({ children, href, onClick, tint }) {
  var _hover = useState(false), hovered = _hover[0], setHovered = _hover[1];
  var isBlue = tint === 'blue';
  var bg = isBlue ? COLORS.blueBg : 'rgba(242,101,34,0.08)';
  var color = isBlue ? COLORS.skyBlue : COLORS.orange;

  var style = {
    display: 'inline-block',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: color,
    background: hovered ? (isBlue ? 'rgba(120,175,207,0.25)' : 'rgba(242,101,34,0.15)') : bg,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: FONTS.inter,
    transition: 'background 0.2s, transform 0.2s',
    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
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

export default function SystemSuggest({ system, tier }) {
  var studioUrl = buildDesignStudioUrl(system);
  var isMid = tier.label === 'Getting There';

  var headerText = isMid
    ? 'Based on your answers, ' + system.name + ' could be a great fit — ' + system.subtitle + '.'
    : 'Just for fun — based on your answers, ' + system.name + ' might be your style. ' + system.subtitle + '.';

  // Icon for header
  var iconSvg = isMid
    ? (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.skyBlue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
    : (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.skyBlue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
      </svg>
    );

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: 20,
      padding: 32,
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      marginTop: 24,
    }}>
      {/* Header with icon */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {iconSvg}
        </div>
        <p style={{
          fontSize: 16,
          color: '#666',
          margin: 0,
          lineHeight: 1.6,
          fontFamily: FONTS.inter,
        }}>
          {headerText}
        </p>
      </div>

      {/* Product row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '16px 20px',
        background: COLORS.bg,
        borderRadius: 14,
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: 100,
          height: 72,
          flexShrink: 0,
          borderRadius: 10,
          overflow: 'hidden',
          background: '#f5f7fa',
        }}>
          <img
            src={getFenceImage(system.id)}
            alt={system.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <h4 style={{
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.navy,
            margin: '0 0 2px',
            fontFamily: FONTS.inter,
          }}>
            {system.name}
          </h4>
          <p style={{
            fontSize: 13,
            color: COLORS.skyBlue,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            margin: '0 0 4px',
            fontFamily: FONTS.inter,
          }}>
            {system.series} &middot; {system.subtitle}
          </p>
          <p style={{
            fontSize: 14,
            color: '#888',
            margin: 0,
            fontFamily: FONTS.inter,
          }}>
            6063-T6 Aluminum &middot; ProCoat Finish &middot; Limited Lifetime Warranty
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <TintButton
            href="#"
            tint="blue"
            onClick={function () { ctaClicked('view_details', system.name); }}
          >
            View Details
          </TintButton>
          <TintButton
            href={studioUrl}
            tint="orange"
            onClick={function () { ctaClicked('try_3d', system.name); }}
          >
            Try in 3D
          </TintButton>
        </div>
      </div>
    </div>
  );
}
