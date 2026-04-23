/**
 * QuizNav.js — Back / Next navigation buttons for the quiz.
 */
import React, { useState } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';

export default function QuizNav({ onBack, onNext, canAdvance, isFirst }) {
  var _useState = useState(false), backHover = _useState[0], setBackHover = _useState[1];
  var _useState2 = useState(false), nextHover = _useState2[0], setNextHover = _useState2[1];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 36,
      maxWidth: 680,
      margin: '36px auto 0',
    }}>
      {/* Back button */}
      {!isFirst ? (
        <button
          onClick={onBack}
          onMouseEnter={function () { setBackHover(true); }}
          onMouseLeave={function () { setBackHover(false); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            color: COLORS.textMuted,
            fontFamily: FONTS.inter,
            padding: '8px 4px',
            transition: 'color 0.2s',
          }}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              transition: 'transform 0.2s',
              transform: backHover ? 'translateX(-4px)' : 'translateX(0)',
            }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      ) : (
        <div />
      )}

      {/* Next button */}
      <button
        onClick={canAdvance ? onNext : undefined}
        onMouseEnter={function () { if (canAdvance) setNextHover(true); }}
        onMouseLeave={function () { setNextHover(false); }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 32px',
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.white,
          background: COLORS.orange,
          border: 'none',
          borderRadius: 28,
          cursor: canAdvance ? 'pointer' : 'default',
          fontFamily: FONTS.inter,
          opacity: canAdvance ? 1 : 0.5,
          pointerEvents: canAdvance ? 'auto' : 'none',
          boxShadow: canAdvance && nextHover
            ? '0 6px 24px rgba(242,101,34,0.4)'
            : '0 2px 12px rgba(242,101,34,0.25)',
          transition: 'opacity 0.2s, box-shadow 0.2s, transform 0.2s',
          transform: canAdvance && nextHover ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        Next
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transition: 'transform 0.2s',
            transform: canAdvance && nextHover ? 'translateX(4px)' : 'translateX(0)',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
