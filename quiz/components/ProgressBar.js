/**
 * ProgressBar.js — Animated progress bar with block label badge.
 */
import React from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import useMediaQuery from '../useMediaQuery';

var BADGE_COLORS = {
  visual: { bg: COLORS.blueBg, color: COLORS.skyBlue },
  scored: { bg: COLORS.greenBg, color: COLORS.green },
  qualify: { bg: COLORS.pinkBg, color: COLORS.pink },
};

export default function ProgressBar({ current, total, block, blockLabel }) {
  var isSmall = useMediaQuery('(max-width: 640px)');
  var pct = ((current + 1) / total) * 100;
  var badge = BADGE_COLORS[block] || BADGE_COLORS.visual;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Top row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textMuted,
          fontFamily: FONTS.inter,
        }}>
          {isSmall ? (current + 1) + ' of ' + total : 'Question ' + (current + 1) + ' of ' + total}
        </span>
        {!isSmall && (
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: badge.color,
            background: badge.bg,
            padding: '4px 12px',
            borderRadius: 20,
            fontFamily: FONTS.inter,
          }}>
            {blockLabel}
          </span>
        )}
      </div>

      {/* Track */}
      <div style={{
        height: 6,
        borderRadius: 3,
        background: COLORS.border,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          borderRadius: 3,
          background: 'linear-gradient(90deg, ' + COLORS.skyBlue + ', ' + COLORS.orange + ')',
          width: pct + '%',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  );
}
