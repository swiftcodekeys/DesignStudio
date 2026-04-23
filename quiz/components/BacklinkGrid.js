/**
 * BacklinkGrid.js — Contextual backlinks based on quiz answers.
 */
import React, { useState } from 'react';
import { COLORS, FONTS } from '../styles/quizStyles';
import { backlinkClicked } from '../analytics';

// Helper to safely get array values
function asArray(val) {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  return [val];
}

// Small SVG icons for link pills
function PageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function GateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="18" rx="1" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function getLinks(answers, system) {
  var links = [];
  var q1 = asArray(answers.q1);

  // ALWAYS shown
  links.push({ text: system.name + ' Product Page', icon: <PageIcon />, key: 'product_page' });
  links.push({ text: 'Buying Guide', icon: <BookIcon />, key: 'buying_guide' });

  // Conditional
  if (q1.includes('pool_safety') || asArray(answers.q4).includes('near_pool')) {
    links.push({ text: 'Pool Code Requirements', icon: <ShieldIcon />, key: 'pool_code' });
  }

  if (q1.includes('hoa_code') || answers.q3 === 'multi_family') {
    links.push({ text: 'HOA Compliance Guide', icon: <ShieldIcon />, key: 'hoa_guide' });
  }

  if (answers.q8 === 'havent_thought' || answers.q8 === 'starting') {
    links.push({ text: 'Why Aluminum?', icon: <HelpIcon />, key: 'why_aluminum' });
  }

  if (answers.q14 === 'info_pricing' || answers.q14 === 'design_myself') {
    links.push({ text: 'Installation Guide', icon: <ToolIcon />, key: 'install_guide' });
  }

  if (answers.q10 === 'know_where' || answers.q10 === 'some_ideas') {
    links.push({ text: 'Matching Gates', icon: <GateIcon />, key: 'matching_gates' });
  }

  return links;
}

function LinkPill({ link }) {
  var _hover = useState(false), hovered = _hover[0], setHovered = _hover[1];

  return (
    <a
      href="#"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        background: hovered ? 'rgba(120,175,207,0.12)' : COLORS.bg,
        color: hovered ? COLORS.skyBlue : '#555',
        borderRadius: 10,
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
        fontFamily: FONTS.inter,
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
      onClick={function (e) {
        e.preventDefault();
        backlinkClicked(link.key);
      }}
    >
      {link.icon}
      {link.text}
    </a>
  );
}

export default function BacklinkGrid({ answers, system }) {
  var links = getLinks(answers || {}, system || {});

  if (links.length === 0) return null;

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: 20,
      padding: 40,
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      marginTop: 24,
    }}>
      {/* Section label */}
      <p style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: COLORS.skyBlue,
        margin: '0 0 16px',
        fontFamily: FONTS.inter,
      }}>
        LEARN MORE
      </p>

      {/* Link pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
      }}>
        {links.map(function (link) {
          return <LinkPill key={link.key} link={link} />;
        })}
      </div>
    </div>
  );
}
