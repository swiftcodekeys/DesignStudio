/**
 * ScoreGauge.js — Animated circular SVG gauge showing the readiness score.
 */
import React, { useEffect, useRef, useState } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import useMediaQuery from '../useMediaQuery';

var KEYFRAMES_ID = 'quiz-score-gauge-keyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  var style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = [
    '@keyframes quizGaugeFadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }',
    '@keyframes quizBadgePop { 0% { transform:scale(0); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }',
  ].join('\n');
  document.head.appendChild(style);
}

var CIRCUMFERENCE = 2 * Math.PI * 45; // ~283

var TIER_MESSAGES = {
  'Project Ready': "You've done your homework. Your project is well-defined and you're ready to move forward with confidence.",
  'Getting There': "You've got strong foundations but a few key steps remain before you're project-ready.",
  'Early Explorer': "You're at the beginning of your fence journey — and that's a great place to be.",
};

function getGradientColors(tierLabel) {
  if (tierLabel === 'Project Ready') return [COLORS.skyBlue, COLORS.green];
  if (tierLabel === 'Getting There') return [COLORS.skyBlue, COLORS.yellow];
  return [COLORS.skyBlue, COLORS.pink];
}

export default function ScoreGauge({ score, tier, name }) {
  var isMobile = useMediaQuery('(max-width: 768px)');
  var _displayScore = useState(0), displayScore = _displayScore[0], setDisplayScore = _displayScore[1];
  var _dashOffset = useState(CIRCUMFERENCE), dashOffset = _dashOffset[0], setDashOffset = _dashOffset[1];
  var animRef = useRef(null);
  var startTimeRef = useRef(null);
  var DURATION = 1500;

  useEffect(function () {
    injectKeyframes();
  }, []);

  useEffect(function () {
    var targetOffset = CIRCUMFERENCE - (CIRCUMFERENCE * score / 100);

    function animate(timestamp) {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      var elapsed = timestamp - startTimeRef.current;
      var progress = Math.min(elapsed / DURATION, 1);
      // ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);

      setDisplayScore(Math.round(eased * score));
      setDashOffset(CIRCUMFERENCE - (CIRCUMFERENCE * score / 100) * eased);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);

    return function () {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [score]);

  var gradColors = getGradientColors(tier.label);
  var gradId = 'scoreGaugeGrad';
  var message = TIER_MESSAGES[tier.label] || TIER_MESSAGES['Early Explorer'];

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: 20,
      padding: isMobile ? '36px 20px' : '52px 44px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      textAlign: 'center',
      animation: 'quizGaugeFadeIn 0.6s ease both',
    }}>
      {/* Section label */}
      <p style={{
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: COLORS.skyBlue,
        margin: '0 0 8px',
        fontFamily: FONTS.inter,
      }}>
        YOUR FENCE READINESS SCORE
      </p>

      {/* Personalized name */}
      <p style={{
        fontSize: 22,
        fontWeight: 600,
        color: COLORS.navy,
        margin: '0 0 32px',
        fontFamily: FONTS.inter,
      }}>
        {name ? name + ', here are your results' : 'Here are your results'}
      </p>

      {/* SVG Gauge */}
      <div style={{ position: 'relative', display: 'inline-block', width: isMobile ? 160 : 200, height: isMobile ? 160 : 200 }}>
        <svg width={isMobile ? '160' : '200'} height={isMobile ? '160' : '200'} viewBox="0 0 100 100">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradColors[0]} />
              <stop offset="100%" stopColor={gradColors[1]} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx="50" cy="50" r="45"
            stroke="#ebebeb"
            strokeWidth="10"
            fill="none"
          />
          {/* Fill circle */}
          <circle
            cx="50" cy="50" r="45"
            stroke={'url(#' + gradId + ')'}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'none' }}
          />
        </svg>
        {/* Center overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 56,
            fontWeight: 900,
            color: COLORS.navy,
            lineHeight: 1,
            fontFamily: FONTS.inter,
          }}>
            {displayScore}
          </span>
          <span style={{
            fontSize: 16,
            color: '#999',
            fontFamily: FONTS.inter,
          }}>
            out of 100
          </span>
        </div>
      </div>

      {/* Tier badge */}
      <div style={{ marginTop: 20 }}>
        <span style={{
          display: 'inline-block',
          padding: '8px 20px',
          borderRadius: 20,
          background: tier.bg,
          color: tier.color,
          fontSize: 15,
          fontWeight: 700,
          fontFamily: FONTS.inter,
          animation: 'quizBadgePop 0.5s ease 1.2s both',
        }}>
          {tier.label}
        </span>
      </div>

      {/* Tier message */}
      <p style={{
        fontSize: 17,
        color: '#666',
        margin: '20px auto 0',
        maxWidth: 480,
        lineHeight: 1.6,
        fontFamily: FONTS.inter,
      }}>
        {message}
      </p>
    </div>
  );
}
