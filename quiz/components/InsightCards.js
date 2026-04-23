/**
 * InsightCards.js — 3 personalized insight cards.
 */
import React, { useEffect } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import useMediaQuery from '../useMediaQuery';

var KEYFRAMES_ID = 'quiz-insight-cards-keyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  var style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent =
    '@keyframes quizSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }';
  document.head.appendChild(style);
}

function InsightCard({ insight, index }) {
  return (
    <div style={{
      background: COLORS.white,
      borderRadius: 16,
      padding: '28px 24px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      animation: 'quizSlideUp 0.5s ease both',
      animationDelay: (index * 150) + 'ms',
    }}>
      {/* Numbered circle */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'rgba(120,175,207,0.12)',
        color: COLORS.skyBlue,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 800,
        fontFamily: FONTS.inter,
        marginBottom: 14,
      }}>
        {index + 1}
      </div>

      {/* Title */}
      <h4 style={{
        fontSize: 17,
        fontWeight: 700,
        color: COLORS.navy,
        margin: '0 0 8px',
        fontFamily: FONTS.inter,
      }}>
        {insight.title}
      </h4>

      {/* Text */}
      <p style={{
        fontSize: 15,
        color: '#666',
        margin: 0,
        lineHeight: 1.6,
        fontFamily: FONTS.inter,
      }}>
        {insight.text}
      </p>
    </div>
  );
}

export default function InsightCards({ insights }) {
  var isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(function () {
    injectKeyframes();
  }, []);

  if (!insights || insights.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 20,
      }}>
        {insights.map(function (insight, i) {
          return <InsightCard key={i} insight={insight} index={i} />;
        })}
      </div>
    </div>
  );
}
