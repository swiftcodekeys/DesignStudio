/**
 * EmailGate.js — Post-quiz email capture form.
 * Renders when state.phase === 'gate'.
 */
import React, { useState, useEffect } from 'react';
import { useQuiz } from '../QuizContext';
import { COLORS, FONTS, getTier } from '../styles/quizStyles';
import { TOTAL_QUESTIONS } from '../quizData';
import { calculateScore, matchSystem } from '../matchingEngine';
import { emailSubmitted, quizCompleted } from '../analytics';
import ProgressBar from './ProgressBar';
import useMediaQuery from '../useMediaQuery';

var KEYFRAMES_ID = 'quiz-pulse-glow-keyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  var style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent =
    '@keyframes quizPulseGlow { 0%,100% { box-shadow: 0 4px 16px rgba(242,101,34,0.25); } 50% { box-shadow: 0 4px 28px rgba(242,101,34,0.5); } }';
  document.head.appendChild(style);
}

function StarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={COLORS.orange} stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
    </svg>
  );
}

export default function EmailGate() {
  var isMobile = useMediaQuery('(max-width: 768px)');
  var _useQuiz = useQuiz(), state = _useQuiz.state, dispatch = _useQuiz.dispatch;

  var _name = useState(''), name = _name[0], setName = _name[1];
  var _email = useState(''), email = _email[0], setEmail = _email[1];
  var _phone = useState(''), phone = _phone[0], setPhone = _phone[1];
  var _errors = useState({}), errors = _errors[0], setErrors = _errors[1];

  useEffect(function () {
    injectKeyframes();
  }, []);

  function validate() {
    var errs = {};
    if (!name || name.trim().length < 2) {
      errs.name = 'Please enter your name';
    }
    if (!email || email.indexOf('@') === -1 || email.indexOf('.', email.indexOf('@')) === -1) {
      errs.email = 'Please enter a valid email';
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    var errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Calculate results
    var score = calculateScore(state.answers);
    var system = matchSystem(state.answers);
    var tier = getTier(score);

    // Dispatch results
    dispatch({ type: 'SET_RESULTS', score: score, matchedSystem: system, tier: tier });

    // Dispatch contact (triggers phase → 'results')
    dispatch({ type: 'SUBMIT_CONTACT', contact: { name: name.trim(), email: email.trim(), phone: phone.trim() } });

    // Save lead to localStorage
    var lead = {
      contact: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      answers: state.answers,
      openText: state.openText,
      score: score,
      tier: tier.label,
      matchedSystem: system,
      timestamp: new Date().toISOString(),
      retakeCount: state.retakeCount || 0,
      location: 'Unknown',
    };
    localStorage.setItem('grandview_quiz_lead', JSON.stringify(lead));

    // Analytics
    emailSubmitted(tier.label, !!phone.trim());
    quizCompleted(score, tier.label, system.name);
  }

  var inputBase = {
    width: '100%',
    maxWidth: isMobile ? '100%' : undefined,
    border: '2px solid ' + COLORS.border,
    borderRadius: 12,
    fontSize: 17,
    fontFamily: FONTS.inter,
    padding: '14px 16px',
    outline: 'none',
    boxSizing: 'border-box',
    color: COLORS.text,
    background: COLORS.white,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  function inputStyle(field) {
    var base = Object.assign({}, inputBase);
    if (errors[field]) {
      base.borderColor = COLORS.orange;
    }
    return base;
  }

  function handleFocus(e) {
    e.target.style.borderColor = COLORS.skyBlue;
    e.target.style.boxShadow = '0 0 0 4px rgba(120,175,207,0.15)';
  }

  function handleBlur(e) {
    e.target.style.borderColor = errors[e.target.name] ? COLORS.orange : COLORS.border;
    e.target.style.boxShadow = 'none';
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      fontFamily: FONTS.inter,
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: isMobile ? '24px 16px' : '40px 32px',
      }}>
        {/* Progress bar at 100% with orange badge */}
        <div style={{ marginBottom: 28 }}>
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
              Complete!
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.white,
              background: COLORS.orange,
              padding: '4px 12px',
              borderRadius: 20,
              fontFamily: FONTS.inter,
            }}>
              Results Ready
            </span>
          </div>
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
              width: '100%',
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>

        {/* White card */}
        <div style={{
          background: COLORS.white,
          borderRadius: 20,
          padding: isMobile ? '32px 20px' : '48px 44px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
          maxWidth: 680,
          margin: '0 auto',
        }}>
          <h2 style={{
            fontSize: 34,
            fontWeight: 800,
            color: COLORS.navy,
            letterSpacing: -1,
            margin: '0 0 12px',
            lineHeight: 1.2,
            fontFamily: FONTS.inter,
          }}>
            Your Fence Readiness Score is ready!
          </h2>
          <p style={{
            fontSize: 18,
            color: '#666',
            margin: '0 0 32px',
            lineHeight: 1.5,
            fontFamily: FONTS.inter,
          }}>
            Enter your details to see your personalized results, matched fence system, and recommended next steps.
          </p>

          {/* Tease card with pulsing glow */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '20px 24px',
            borderRadius: 14,
            background: 'rgba(242,101,34,0.04)',
            marginBottom: 32,
            animation: 'quizPulseGlow 2s ease-in-out infinite',
          }}>
            <StarIcon />
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.navy,
              fontFamily: FONTS.inter,
            }}>
              Your score, system match, and action plan are waiting
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Name field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.textMuted,
                letterSpacing: 1,
                marginBottom: 6,
                fontFamily: FONTS.inter,
              }}>
                FULL NAME
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={function (e) { setName(e.target.value); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
                style={inputStyle('name')}
              />
              {errors.name && (
                <p style={{ fontSize: 13, color: COLORS.orange, margin: '6px 0 0', fontFamily: FONTS.inter }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.textMuted,
                letterSpacing: 1,
                marginBottom: 6,
                fontFamily: FONTS.inter,
              }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={function (e) { setEmail(e.target.value); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
                style={inputStyle('email')}
              />
              {errors.email && (
                <p style={{ fontSize: 13, color: COLORS.orange, margin: '6px 0 0', fontFamily: FONTS.inter }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone field (optional) */}
            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.textMuted,
                letterSpacing: 1,
                marginBottom: 6,
                fontFamily: FONTS.inter,
              }}>
                PHONE NUMBER (optional)
              </label>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={function (e) { setPhone(e.target.value); }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputBase}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              style={{
                display: 'block',
                width: '100%',
                padding: '16px 32px',
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
              }}
              onMouseEnter={function (e) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(242,101,34,0.45)';
              }}
              onMouseLeave={function (e) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(242,101,34,0.35)';
              }}
            >
              See My Results &rarr;
            </button>

            {/* Privacy text */}
            <p style={{
              fontSize: 13,
              color: '#bbb',
              textAlign: 'center',
              margin: '16px 0 0',
              fontFamily: FONTS.inter,
            }}>
              We respect your privacy. No spam, ever. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
