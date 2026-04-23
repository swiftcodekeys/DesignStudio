/**
 * OptionList.js — Radio list for Block 2 & 3 questions.
 */
import React, { useEffect } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';

var KEYFRAMES_ID = 'quiz-option-list-keyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  var style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent =
    '@keyframes quizFadeSlide { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }';
  document.head.appendChild(style);
}

function RadioCircle({ checked }) {
  return (
    <div style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      border: '2px solid ' + (checked ? COLORS.orange : '#ccc'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'border-color 0.2s',
    }}>
      {checked && (
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: COLORS.orange,
          transition: 'transform 0.2s',
        }} />
      )}
    </div>
  );
}

function OptionRow({ option, isSelected, onSelect, index }) {
  var _React$useState = React.useState(false), hovered = _React$useState[0], setHovered = _React$useState[1];

  return (
    <div
      onClick={function () { onSelect(option.value); }}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        border: '2px solid ' + (isSelected ? COLORS.orange : hovered ? COLORS.skyBlue : COLORS.border),
        borderRadius: 14,
        padding: '20px 24px',
        cursor: 'pointer',
        background: isSelected ? 'rgba(242,101,34,0.04)' : COLORS.white,
        transition: 'border-color 0.2s, transform 0.2s, background 0.2s',
        transform: hovered && !isSelected ? 'translateX(4px)' : 'translateX(0)',
        animation: 'quizFadeSlide 0.3s ease both',
        animationDelay: (index * 50) + 'ms',
      }}
    >
      <RadioCircle checked={isSelected} />
      <span style={{
        fontSize: 17,
        fontWeight: isSelected ? 600 : 500,
        color: isSelected ? COLORS.navy : COLORS.textDark,
        fontFamily: FONTS.inter,
      }}>
        {option.label}
      </span>
    </div>
  );
}

export default function OptionList({ options, selected, onSelect }) {
  useEffect(function () {
    injectKeyframes();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {options.map(function (opt, i) {
        return (
          <OptionRow
            key={opt.value}
            option={opt}
            isSelected={selected === opt.value}
            onSelect={onSelect}
            index={i}
          />
        );
      })}
    </div>
  );
}
