/**
 * OpenTextQuestion.js — Open text input for Q15.
 */
import React, { useState } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';

export default function OpenTextQuestion({ value, onChange }) {
  var _useState = useState(false), focused = _useState[0], setFocused = _useState[1];

  return (
    <textarea
      value={value || ''}
      onChange={function (e) { onChange(e.target.value); }}
      onFocus={function () { setFocused(true); }}
      onBlur={function () { setFocused(false); }}
      rows={4}
      placeholder="Share anything you'd like us to know..."
      style={{
        width: '100%',
        border: '2px solid ' + (focused ? COLORS.skyBlue : COLORS.border),
        borderRadius: 12,
        fontSize: 17,
        fontFamily: FONTS.inter,
        padding: '16px 18px',
        outline: 'none',
        resize: 'vertical',
        boxSizing: 'border-box',
        lineHeight: 1.5,
        color: COLORS.text,
        background: COLORS.white,
        boxShadow: focused ? '0 0 0 4px rgba(120,175,207,0.12)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    />
  );
}
