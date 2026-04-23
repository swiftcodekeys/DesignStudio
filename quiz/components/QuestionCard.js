/**
 * QuestionCard.js — Animated question container with slide-up entrance.
 */
import React, { useState, useEffect } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';

export default function QuestionCard({ question, hint, children }) {
  var _useState = useState(false), visible = _useState[0], setVisible = _useState[1];

  // Reset and re-animate when question text changes
  useEffect(function () {
    setVisible(false);
    var raf = requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setVisible(true);
      });
    });
    return function () { cancelAnimationFrame(raf); };
  }, [question]);

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: 20,
      padding: '48px 44px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      maxWidth: 680,
      margin: '0 auto',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>
      <h2 style={{
        fontSize: 34,
        fontWeight: 800,
        color: COLORS.navy,
        letterSpacing: -1,
        margin: 0,
        lineHeight: 1.2,
        fontFamily: FONTS.inter,
      }}>
        {question}
      </h2>
      {hint && (
        <p style={{
          fontSize: 16,
          color: COLORS.textMuted,
          marginTop: 8,
          marginBottom: 32,
          fontFamily: FONTS.inter,
        }}>
          {hint}
        </p>
      )}
      {!hint && <div style={{ marginBottom: 32 }} />}
      {children}
    </div>
  );
}
