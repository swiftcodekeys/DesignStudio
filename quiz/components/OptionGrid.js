/**
 * OptionGrid.js — Image card grid for Block 1 visual questions.
 */
import React, { useRef, useEffect } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import { getIcon } from './QuizIcons';
import useMediaQuery from '../useMediaQuery';

var KEYFRAMES_ID = 'quiz-option-grid-keyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  var style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = [
    '@keyframes quizFadeScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }',
    '@keyframes quizCheckPop { 0% { transform:scale(0); } 50% { transform:scale(1.3); } 100% { transform:scale(1); } }',
  ].join('\n');
  document.head.appendChild(style);
}

function CheckBadge() {
  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: COLORS.orange,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'quizCheckPop 0.35s ease',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

function OptionCard({ option, isSelected, onSelect, index }) {
  var _React$useState = React.useState(false), hovered = _React$useState[0], setHovered = _React$useState[1];

  var cardStyle = {
    position: 'relative',
    border: '2px solid ' + (isSelected ? COLORS.orange : hovered ? COLORS.skyBlue : COLORS.border),
    borderRadius: 14,
    padding: '28px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: isSelected ? 'rgba(242,101,34,0.04)' : COLORS.white,
    transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s, background 0.2s',
    transform: hovered && !isSelected ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hovered && !isSelected ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
    animation: 'quizFadeScale 0.35s ease both',
    animationDelay: (index * 50) + 'ms',
  };

  return (
    <div
      style={cardStyle}
      onClick={function () { onSelect(option.value); }}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
    >
      {isSelected && <CheckBadge />}
      <div style={{ color: isSelected ? COLORS.orange : COLORS.navy, marginBottom: 10 }}>
        {getIcon(option.icon) || getIcon('grid')}
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        color: isSelected ? COLORS.orange : COLORS.navy,
        fontFamily: FONTS.inter,
      }}>
        {option.label}
      </div>
    </div>
  );
}

export default function OptionGrid({ options, selected, multiSelect, onSelect }) {
  var isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(function () {
    injectKeyframes();
  }, []);

  var selectedArr = multiSelect
    ? (Array.isArray(selected) ? selected : [])
    : (selected ? [selected] : []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gap: 16,
    }}>
      {options.map(function (opt, i) {
        return (
          <OptionCard
            key={opt.value}
            option={opt}
            isSelected={selectedArr.indexOf(opt.value) !== -1}
            onSelect={onSelect}
            index={i}
          />
        );
      })}
    </div>
  );
}
