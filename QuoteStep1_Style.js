// QuoteStep1_Style.js — Style & Config step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React, { useEffect, useState } from 'react';
import { Check, Info, SwimmingPool, ShieldCheck } from '@phosphor-icons/react';
import InfoPopup from './InfoPopup';
import { PRIVACY_STYLES } from './configData';
import { estimatePerFootRange } from './retailPricing';

function fmtDollarsInt(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ---- Style image mappings ----
// Gate-view images from ifence_previews/gate_styles/
var STYLE_IMAGES = {
  'horizon':        'assets/ifence_previews/gate_styles/san_marino_15.png',
  'haven':          'assets/ifence_previews/gate_styles/boca_grande_45.png',
  'charleston':     'assets/ifence_previews/gate_styles/bella_vista_48.png',
  'vanguard':       'assets/ifence_previews/gate_styles/sanibel_12.png',
  'savannah':       'assets/ifence_previews/gate_styles/bella_terra_51.png',
  'horizon-pro':    'assets/ifence_previews/gate_styles/santa_monica_9.png',
  'charleston-pro': 'assets/ifence_previews/gate_styles/charleston_pro.png',
  'lexington':      'assets/ifence_previews/gate_styles/excelsior_30.png',
  'eclipse':        'assets/ifence_previews/gate_styles/new_orleans_21.png',
  'defender':       'assets/ifence_previews/gate_styles/castile_36.png',
};

// ---- Full style catalog with metadata ----
// poolCompliance: 'default' = flush bottom standard (free), 'upgrade' = flush bottom available as upcharge, 'none' = not pool-rated
var ALL_STYLES = [
  { id: 'horizon',        name: 'Horizon',        sub: 'Flat Top',                   badge: 'POPULAR',     poolSafe: true,  poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: 'horizon-pro' },
  { id: 'haven',          name: 'Haven',           sub: 'Flat Top Flush',             badge: 'POOL',        poolSafe: true,  poolCompliance: 'default', grades: ['residential'], proVariant: null },
  { id: 'charleston',     name: 'Charleston',      sub: 'Spear Top',                  badge: 'POPULAR',     poolSafe: true,  poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: 'charleston-pro' },
  { id: 'vanguard',       name: 'Vanguard',        sub: 'Flat Top w/ Spears',         badge: null,          poolSafe: true,  poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: null },
  { id: 'savannah',       name: 'Savannah',        sub: 'Staggered Spear',            badge: null,          poolSafe: true,  poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: null },
  { id: 'lexington',      name: 'Lexington',       sub: 'Convex',                     badge: 'DECORATIVE',  poolSafe: true,  poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: null },
  { id: 'eclipse',        name: 'Eclipse',         sub: 'Concave',                    badge: 'DECORATIVE',  poolSafe: true,  poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: null },
  { id: 'horizon-pro',    name: 'Horizon Pro',     sub: 'Flat Top \u00B7 1\u00BD" Spacing', badge: 'PUPPY READY', poolSafe: true, poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: null },
  { id: 'charleston-pro', name: 'Charleston Pro',  sub: 'Spear Top \u00B7 1\u00BD" Spacing', badge: 'CLASSIC',    poolSafe: true, poolCompliance: 'upgrade', grades: ['residential', 'commercial', 'industrial'], proVariant: null },
  { id: 'defender',       name: 'Defender',        sub: 'Industrial Security',        badge: 'SECURITY',    poolSafe: false, poolCompliance: 'none',    grades: ['industrial'], proVariant: null },
];

// Pro spacing is only available for styles that have a pro variant
var PRO_SPACING_STYLES = ['horizon', 'charleston', 'vanguard', 'savannah', 'horizon-pro', 'charleston-pro'];

// ---- Pool-code minimum heights per style family (Task 2) ----
// Haven family is purpose-built flush-bottom and meets code at 48".
// Flat-top styles need 54"+ to prevent climbing toeholds.
// Spear-top need 60"+ per BOCA/IRC guidance.
// Defender is industrial-security — flagged "Not recommended" below.
export var POOL_MIN_HEIGHT_BY_STYLE = {
  'haven': 48, 'haven-lite': 48, 'haven-plus': 48, 'haven-guard': 48,
  'horizon': 54, 'horizon-pro': 54, 'vanguard': 54, 'vanguard-pro': 54,
  'charleston': 60, 'charleston-pro': 60,
  'savannah': 60, 'savannah-pro': 60,
  'eclipse': 60, 'eclipse-pro': 60,
  'lexington': 60, 'lexington-pro': 60,
};
var POOL_HAVEN_FAMILY = ['haven', 'haven-lite', 'haven-plus', 'haven-guard'];
function isHavenFamily(id) { return POOL_HAVEN_FAMILY.indexOf(id) >= 0; }

// ---- Heights per grade ----
var HEIGHTS_BY_GRADE = {
  residential: [36, 42, 48, 54, 60, 72],
  commercial:  [48, 60, 72],
  industrial:  [48, 60, 72, 84, 96, 108, 120],
};

// ---- Color list ----
var COLORS = [
  { id: 'textured-black',   name: 'Textured Black',   hex: '#1a1a1a' },
  { id: 'gloss-black',      name: 'Gloss Black',      hex: '#090909' },
  { id: 'textured-bronze',  name: 'Textured Bronze',  hex: '#5a4d3e' },
  { id: 'gloss-bronze',     name: 'Gloss Bronze',     hex: '#42382c' },
  { id: 'textured-white',   name: 'Textured White',   hex: '#e8e8e8' },
  { id: 'gloss-white',      name: 'Gloss White',      hex: '#f4f4f4' },
  { id: 'textured-khaki',   name: 'Textured Khaki',   hex: '#b8ac9f' },
  { id: 'silver',           name: 'Silver',           hex: '#c8c8c8', premium: true },
];

// ---- Puppy sub-styles ----
var PUPPY_STYLES = [
  { id: 'flush',                   name: 'Flush',                     img: 'gate_tool/th/th_pup_fls.jpg' },
  { id: 'standard',                name: 'Standard',                  img: 'gate_tool/th/th_pup_std.jpg' },
  { id: 'classic-plugged',         name: 'Classic Plugged',           img: 'gate_tool/th/th_pup_plg.jpg' },
  { id: 'classic-spear',           name: 'Classic Spear',             img: 'gate_tool/th/th_pup_spe.jpg' },
  { id: 'classic-spear-staggered', name: 'Classic Spear Staggered',   img: 'gate_tool/th/th_pup_sps.jpg' },
  { id: 'classic-tri',             name: 'Classic Tri',               img: 'gate_tool/th/th_pup_tri.jpg' },
  { id: 'classic-tri-staggered',   name: 'Classic Tri Staggered',     img: 'gate_tool/th/th_pup_trs.jpg' },
  { id: 'classic-quad',            name: 'Classic Quad',              img: 'gate_tool/th/th_pup_qua.jpg' },
  { id: 'classic-quad-staggered',  name: 'Classic Quad Staggered',    img: 'gate_tool/th/th_pup_qus.jpg' },
];

// ---- Grade definitions ----
var GRADES = [
  { id: 'residential',  name: 'Residential',  desc: 'Homes, yards, pools' },
  { id: 'commercial',   name: 'Commercial',   desc: 'Business, HOA, parks' },
  { id: 'industrial',   name: 'Industrial',   desc: 'High-security, utilities' },
];

// ---- Helpers ----
function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

function sectionHeader(title, infoProps) {
  return el('div', { className: 'qs1-section-header' },
    el('h4', { className: 'qs1-section-title' }, title),
    infoProps ? React.createElement(InfoPopup, infoProps) : null
  );
}

// Collapsible section header used by Grade / Fence Type / Style so the buyer
// isn't re-asked to re-pick things the wizard already captured. When expanded
// it looks like a normal section; when collapsed it shows the current
// selection with a Change affordance.
function collapsibleHeader(opts) {
  // opts: { title, valueLabel, valueThumb, expanded, onToggle, changeLabel }
  var changeLabel = opts.changeLabel || 'Change';
  return el('div', { className: 'qs1-collapsible-header' + (opts.expanded ? ' expanded' : '') },
    el('div', { className: 'qs1-collapsible-label-row' },
      el('h4', { className: 'qs1-section-title' }, opts.title),
      !opts.expanded && opts.valueLabel ? el('div', { className: 'qs1-collapsible-value' },
        opts.valueThumb ? el('img', { src: opts.valueThumb, alt: '', className: 'qs1-collapsible-thumb' }) : null,
        el('span', { className: 'qs1-collapsible-value-text' }, opts.valueLabel)
      ) : null
    ),
    el('button', {
      type: 'button',
      className: 'qs1-collapsible-toggle',
      onClick: opts.onToggle,
      'aria-expanded': opts.expanded ? 'true' : 'false',
    }, opts.expanded ? 'Collapse' : changeLabel)
  );
}

function selCard(selected, onClick, children, className, key) {
  return el('button', {
    key: key,
    className: 'qs1-card' + (selected ? ' selected' : '') + (className ? ' ' + className : ''),
    onClick: onClick,
  }, children);
}

// ============================================================
// QuoteStep1_Style Component
// ============================================================
function QuoteStep1_Style(props) {
  var data = props.data;
  var update = props.update;
  var poolCompliance = props.poolCompliance;

  var grade = data.grade || 'residential';
  var availableHeights = HEIGHTS_BY_GRADE[grade] || HEIGHTS_BY_GRADE.residential;

  // Collapsed-by-default for already-selected sections so the buyer doesn't
  // re-encounter the full pick grid for things the wizard captured. Start
  // expanded only when nothing's picked yet.
  var gradeExpandedState = useState(!data.grade);
  var gradeExpanded = gradeExpandedState[0];
  var setGradeExpanded = gradeExpandedState[1];

  var fenceTypeExpandedState = useState(!data.fenceType);
  var fenceTypeExpanded = fenceTypeExpandedState[0];
  var setFenceTypeExpanded = fenceTypeExpandedState[1];

  var styleExpandedState = useState(!data.style);
  var styleExpanded = styleExpandedState[0];
  var setStyleExpanded = styleExpandedState[1];

  // Pool compliance: lock flush bottom, filter styles
  var poolLocked = !!(poolCompliance && poolCompliance.poolBarrier);

  // Build available styles: filter by grade only. In pool mode we keep
  // ALL styles visible and guide the user with badges/warnings instead
  // of hiding — see Task 2 ("warn, don't wall").
  var availableStyles = ALL_STYLES.filter(function(s) {
    return s.grades.indexOf(grade) >= 0;
  });

  // If current style not available, clear it
  var styleValid = !data.style || availableStyles.some(function(s) { return s.id === data.style; });
  if (!styleValid && data.style) {
    setTimeout(function() { update({ style: '' }); }, 0);
  }

  // If current height not available for grade, pick closest.
  // useEffect with [grade] dep: only fires when grade changes, not on every
  // render. Prevents a race where repeated render-phase setTimeouts clobber
  // the user's height click when data.height is a string ("48") but
  // availableHeights contains numbers (indexOf never matches, so every
  // render queued a reset that fired after the click).
  var numHeight = Number(data.height);
  useEffect(function() {
    if (availableHeights.indexOf(numHeight) >= 0) return;
    if (!data.height) return;
    var closest = availableHeights.reduce(function(prev, curr) {
      return Math.abs(curr - numHeight) < Math.abs(prev - numHeight) ? curr : prev;
    });
    update({ height: closest });
  }, [grade]);

  // Pro spacing availability — only for styles that support it
  var proSpacingAvailable = PRO_SPACING_STYLES.indexOf(data.style) >= 0;

  // If pro spacing selected but style doesn't support it, reset to standard
  if (data.spacing === 'pro' && !proSpacingAvailable) {
    setTimeout(function() { update({ spacing: 'standard' }); }, 0);
  }

  var isProSpacing = data.spacing === 'pro';

  // Racking warning: puppy + butterflies/scrolls
  var hasButterfliesOrScrolls = !!(data.extras && (data.extras.butterflies || data.extras.scrolls));
  var showRackingWarning = data.puppyPickets && hasButterfliesOrScrolls;

  return el('div', { className: 'qs1-container' },

    // ---- Grade (collapsible — defaults to Residential, rarely changed) ----
    collapsibleHeader({
      title: 'Grade',
      valueLabel: (GRADES.find(function(g){ return g.id === grade; }) || {}).name || 'Residential',
      expanded: gradeExpanded,
      onToggle: function() { setGradeExpanded(!gradeExpanded); },
      changeLabel: 'Change grade',
    }),
    gradeExpanded ? el('div', { className: 'qs1-card-row' },
      GRADES.map(function(g) {
        return selCard(grade === g.id, function() { update({ grade: g.id }); },
          el('div', null,
            el('div', { className: 'qs1-card-title' }, g.name),
            el('div', { className: 'qs1-card-desc' }, g.desc)
          ),
          null,
          g.id
        );
      })
    ) : null,

    // ---- Fence Type (collapsible) ----
    collapsibleHeader({
      title: 'Fence Type',
      valueLabel: data.fenceType === 'privacy' ? 'Privacy' : 'Ornamental',
      expanded: fenceTypeExpanded,
      onToggle: function() { setFenceTypeExpanded(!fenceTypeExpanded); },
      changeLabel: 'Change type',
    }),
    fenceTypeExpanded ? el('div', { className: 'qs1-toggle-row' },
      el('button', {
        className: 'qs1-toggle' + (data.fenceType === 'ornamental' ? ' active' : ''),
        onClick: function() { update({ fenceType: 'ornamental' }); },
      }, 'Ornamental'),
      el('button', {
        className: 'qs1-toggle' + (data.fenceType === 'privacy' ? ' active' : ''),
        onClick: function() { update({ fenceType: 'privacy' }); },
      }, 'Privacy')
    ) : null,

    // ---- Privacy Sub-Type Picker (only when fenceType === 'privacy') ----
    data.fenceType === 'privacy' ? el('div', { className: 'qs1-privacy-section' },
      sectionHeader('Privacy Type'),
      el('div', { className: 'qs1-style-grid' },
        PRIVACY_STYLES.map(function(ps) {
          return el('button', {
            key: ps.id,
            className: 'qs1-style-card' + (data.privacyType === ps.id ? ' selected' : ''),
            onClick: function() { update({ privacyType: ps.id }); },
          },
            el('div', { className: 'qs1-card-body' },
              el('div', { className: 'qs1-style-name' }, ps.name),
              el('div', { className: 'qs1-card-desc' }, ps.type)
            ),
            data.privacyType === ps.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 14, weight: 'bold' })) : null
          );
        })
      ),

      // Independent Post Color picker
      sectionHeader('Post Color'),
      el('div', { className: 'qs1-color-grid' },
        COLORS.map(function(c) {
          return el('button', {
            key: c.id,
            className: 'qs1-color-card' + (data.privacyPostColor === c.id ? ' selected' : ''),
            onClick: function() { update({ privacyPostColor: c.id }); },
          },
            el('div', { className: 'qs1-color-swatch', style: { backgroundColor: c.hex } }),
            el('div', { className: 'qs1-color-name' }, c.name),
            c.premium ? el('span', { className: 'qs1-badge qs1-badge-premium' }, 'PREMIUM') : null,
            data.privacyPostColor === c.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
          );
        })
      ),

      // Independent Panel Color picker
      sectionHeader('Panel Color'),
      el('div', { className: 'qs1-color-grid' },
        COLORS.map(function(c) {
          return el('button', {
            key: c.id,
            className: 'qs1-color-card' + (data.privacyPanelColor === c.id ? ' selected' : ''),
            onClick: function() { update({ privacyPanelColor: c.id }); },
          },
            el('div', { className: 'qs1-color-swatch', style: { backgroundColor: c.hex } }),
            el('div', { className: 'qs1-color-name' }, c.name),
            c.premium ? el('span', { className: 'qs1-badge qs1-badge-premium' }, 'PREMIUM') : null,
            data.privacyPanelColor === c.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
          );
        })
      )
    ) : null,

    // ---- Style (collapsible — so a buyer who already picked one isn't re-asked) ----
    data.fenceType !== 'privacy' ? collapsibleHeader({
      title: 'Style',
      valueLabel: (function() {
        var s = ALL_STYLES.find(function(st){ return st.id === data.style; });
        return s ? s.name : null;
      })(),
      valueThumb: STYLE_IMAGES[data.style] || null,
      expanded: styleExpanded,
      onToggle: function() { setStyleExpanded(!styleExpanded); },
      changeLabel: 'Change style',
    }) : null,

    // Pool info banner — keep all styles visible; guide with per-card badges below
    data.fenceType !== 'privacy' && poolLocked && styleExpanded ? el('div', { className: 'qs1-pool-banner' },
      React.createElement(SwimmingPool, { size: 18, weight: 'fill', style: { flexShrink: 0 } }),
      el('div', null,
        el('strong', null, 'Pool code compliance auto-configured'),
        el('div', { className: 'qs1-pool-banner-sub' },
          'Flush bottom rail and minimum height selected for your style. Haven is purpose-built for pools; other styles work at code-compliant heights.'
        )
      )
    ) : null,

    // Style grid (ornamental only, and only when expanded — collapsed shows summary via collapsibleHeader)
    data.fenceType !== 'privacy' && styleExpanded ? el('div', { className: 'qs1-style-grid' },
      availableStyles.map(function(style) {
        var imgSrc = STYLE_IMAGES[style.id] || '';
        var isSelected = data.style === style.id;
        var badgeClass = style.badge ? 'qs1-badge qs1-badge-' + style.badge.toLowerCase().replace(/\s+/g, '-') : '';
        var havenFam = isHavenFamily(style.id);
        var isDefender = style.id === 'defender';
        return el('button', {
          key: style.id,
          className: 'qs1-style-card' + (isSelected ? ' selected' : ''),
          onClick: function() { update({ style: style.id }); },
        },
          imgSrc ? el('img', { src: imgSrc, alt: style.name, className: 'qs1-style-img' }) : null,
          el('div', { className: 'qs1-style-name' }, style.name),
          el('div', { className: 'qs1-style-sub' }, style.sub),
          // Badges
          el('div', { className: 'qs1-badge-row' },
            style.badge ? el('span', { className: badgeClass }, style.badge) : null,
            // Pre-pool "pool safe" badge (kept for non-pool projects)
            style.poolSafe && !poolLocked ? el('span', { className: 'qs1-badge qs1-badge-pool-safe' },
              React.createElement(ShieldCheck, { size: 10, weight: 'fill' }),
              ' POOL SAFE'
            ) : null,
            style.id === 'haven' && !poolLocked ? el('span', { className: 'qs1-badge qs1-badge-pool-fav' }, '\u2605 #1 POOL CHOICE') : null,
            // Pool-mode per-style guidance badges (Task 2)
            poolLocked && havenFam ? el('span', { className: 'qs1-badge qs1-badge-pool-ready' },
              React.createElement(ShieldCheck, { size: 10, weight: 'fill' }),
              ' POOL READY'
            ) : null,
            poolLocked && !havenFam && !isDefender ? el('span', { className: 'qs1-badge qs1-badge-pool-configurable' }, 'POOL CONFIGURABLE') : null,
            poolLocked && isDefender ? el('span', { className: 'qs1-badge qs1-badge-pool-warn' }, 'NOT RECOMMENDED FOR POOLS') : null
          ),
          isSelected ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 14, weight: 'bold' })) : null
        );
      })
    ) : null,

    // Inline pool-note under the style grid
    data.fenceType !== 'privacy' && poolLocked ? el('div', { className: 'qs1-pool-note' },
      'Pool code compliance auto-configured. Flush bottom and minimum height selected for your style.'
    ) : null,

    // ---- Picket Spacing (conditional — only when style supports it) ----
    data.fenceType !== 'privacy' && proSpacingAvailable ? sectionHeader('Picket Spacing', {
      title: 'Picket Spacing',
      text: 'Standard spacing has pickets at regular intervals. Pro spacing adds additional pickets between each standard picket for a denser look and enhanced security.',
      imageSrc: 'assets/ifence_previews/config_options/extreme_spacing_116.png',
    }) : null,
    data.fenceType !== 'privacy' && proSpacingAvailable ? el('div', { className: 'qs1-card-row' },
      selCard(data.spacing === 'standard', function() { update({ spacing: 'standard' }); },
        el('div', null,
          el('div', { className: 'qs1-card-title' }, 'Standard'),
          el('div', { className: 'qs1-card-desc' }, 'Classic picket spacing')
        )
      ),
      selCard(data.spacing === 'pro', function() { update({ spacing: 'pro' }); },
        el('div', null,
          el('div', { className: 'qs1-card-title' }, 'Pro'),
          el('div', { className: 'qs1-card-desc' }, 'Extra pickets for density')
        )
      )
    ) : null,
    isProSpacing ? el('div', { className: 'qs1-tip' },
      'Pro spacing already includes extra pickets. Puppy pickets may not be needed.'
    ) : null,

    // ---- Puppy Pickets ----
    data.fenceType !== 'privacy' ? sectionHeader('Puppy Pickets', {
      title: 'Puppy Pickets',
      text: 'Smaller pickets added to the bottom section of your fence to prevent small pets from squeezing through. Multiple classic styles available with decorative finials.',
    }) : null,
    data.fenceType !== 'privacy' ? el('label', { className: 'qs1-checkbox-row' },
      el('input', {
        type: 'checkbox',
        checked: !!data.puppyPickets,
        onChange: function(e) {
          var checked = e.target.checked;
          update({ puppyPickets: checked, puppyStyle: checked ? (data.puppyStyle || 'standard') : '' });
        },
      }),
      el('span', null, 'Add puppy pickets to my panels')
    ) : null,
    data.puppyPickets && data.fenceType !== 'privacy' ? el('div', { className: 'qs1-puppy-grid' },
      PUPPY_STYLES.map(function(ps) {
        return el('button', {
          key: ps.id,
          className: 'qs1-puppy-card' + (data.puppyStyle === ps.id ? ' selected' : ''),
          onClick: function() { update({ puppyStyle: ps.id }); },
        },
          el('img', { src: ps.img, alt: ps.name, className: 'qs1-puppy-img' }),
          el('div', { className: 'qs1-puppy-name' }, ps.name),
          data.puppyStyle === ps.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
        );
      })
    ) : null,
    showRackingWarning ? el('div', { className: 'qs1-warning' },
      'Note: Puppy pickets with butterflies or scrolls limits racking to Standard only.'
    ) : null,

    // ---- Height ----
    sectionHeader('Height', {
      title: 'Fence Height',
      text: 'Height is measured from ground to top of picket. Taller fences provide more privacy and security. Available heights vary by grade.',
    }),
    el('div', { className: 'qs1-height-grid' },
      availableHeights.map(function(h) {
        return el('button', {
          key: h,
          className: 'qs1-height-card' + (numHeight === h ? ' selected' : ''),
          onClick: function() { update({ height: h }); },
        },
          el('div', { className: 'qs1-height-val' }, h + '"'),
          el('div', { className: 'qs1-height-ft' }, (h / 12).toFixed(1) + ' ft')
        );
      })
    ),
    // Pool-code warning when selected height is below style minimum
    poolLocked && data.style && POOL_MIN_HEIGHT_BY_STYLE[data.style] && numHeight < POOL_MIN_HEIGHT_BY_STYLE[data.style] ? el('div', { className: 'qs1-warning' },
      'Heads up: this height may not meet pool code for this style. ',
      'Haven styles are the safest choice at 48". Always verify with your local inspector.'
    ) : null,

    // ---- Color ----
    sectionHeader('Color', {
      title: 'Fence Color',
      text: 'All colors use a durable ProCoat powder coat finish. Textured finishes hide fingerprints. Gloss finishes have a sleek shine. Silver is a premium metallic option.',
    }),
    el('div', { className: 'qs1-color-grid' },
      COLORS.map(function(c) {
        return el('button', {
          key: c.id,
          className: 'qs1-color-card' + (data.color === c.id ? ' selected' : ''),
          onClick: function() { update({ color: c.id }); },
        },
          el('div', { className: 'qs1-color-swatch', style: { backgroundColor: c.hex } }),
          el('div', { className: 'qs1-color-name' }, c.name),
          c.premium ? el('span', { className: 'qs1-badge qs1-badge-premium' }, 'PREMIUM') : null,
          data.color === c.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
        );
      })
    ),

    // ---- Rails ----
    sectionHeader('Rails', {
      title: 'Rail Count',
      text: 'More rails add strength and visual weight. 2-rail is lighter/decorative, 3-rail is the standard, 4-rail adds extra rigidity for taller fences.',
    }),
    el('div', { className: 'qs1-card-row' },
      [2, 3, 4].map(function(r) {
        return selCard(data.rails === r, function() { update({ rails: r }); },
          el('div', null,
            el('div', { className: 'qs1-card-title' }, r + '-Rail'),
            r === 3 ? el('div', { className: 'qs1-card-desc' }, 'Standard') : null
          ),
          null,
          'rail-' + r
        );
      })
    ),

    // ---- Bottom Rail ----
    sectionHeader('Bottom Rail', {
      title: 'Bottom Rail Position',
      text: 'Standard bottom rail sits above ground level. Flush bottom rail sits at ground level, required for pool code compliance to prevent gaps.',
    }),
    poolLocked ? el('div', { className: 'qs1-pool-note' },
      'Pool compliance requires flush bottom rail. Auto-selected.'
    ) : null,
    el('div', { className: 'qs1-toggle-row' },
      el('button', {
        className: 'qs1-toggle' + (data.bottomRail === 'standard' ? ' active' : '') + (poolLocked ? ' disabled' : ''),
        onClick: function() { if (!poolLocked) update({ bottomRail: 'standard' }); },
        disabled: poolLocked,
      }, 'Standard'),
      el('button', {
        className: 'qs1-toggle' + (data.bottomRail === 'flush' ? ' active' : '') + (poolLocked ? ' locked' : ''),
        onClick: function() { update({ bottomRail: 'flush' }); },
      }, 'Flush')
    ),

    // ---- Post Caps ----
    sectionHeader('Post Caps', {
      title: 'Post Caps',
      text: 'Flat caps are included with every order. Ball caps are a decorative upgrade that adds an elegant finishing touch to each post.',
    }),
    el('div', { className: 'qs1-card-row qs1-postcap-row' },
      el('button', {
        className: 'qs1-postcap-card' + (data.postCap === 'flat' ? ' selected' : ''),
        onClick: function() { update({ postCap: 'flat' }); },
      },
        el('img', { src: 'assets/ifence_previews/post_caps/flat_cap_71.png', alt: 'Flat cap', className: 'qs1-postcap-img' }),
        el('div', { className: 'qs1-card-title' }, 'Flat'),
        el('div', { className: 'qs1-card-desc' }, 'Included'),
        data.postCap === 'flat' ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
      ),
      el('button', {
        className: 'qs1-postcap-card' + (data.postCap === 'ball' ? ' selected' : ''),
        onClick: function() { update({ postCap: 'ball' }); },
      },
        el('img', { src: 'assets/ifence_previews/post_caps/ball_cap_74.png', alt: 'Ball cap', className: 'qs1-postcap-img' }),
        el('div', { className: 'qs1-card-title' }, 'Ball'),
        el('div', { className: 'qs1-card-desc' }, 'Upgrade'),
        data.postCap === 'ball' ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
      )
    ),

    // ---- Live per-linear-foot price estimate (Task 3) ----
    // Renders only once we have enough inputs. Updates on every re-render
    // because style/height/spacing are state, so React recomputes on change.
    (function() {
      if (data.fenceType === 'privacy') return null;
      var est = estimatePerFootRange(data);
      if (!est) return null;
      return el('div', { className: 'qs1-estimate' },
        el('div', { className: 'qs1-estimate-range' },
          'Estimated: ' + fmtDollarsInt(est.low) + '\u2013' + fmtDollarsInt(est.high) + ' per linear foot'
        ),
        el('div', { className: 'qs1-estimate-note' },
          'Gates, posts & shipping calculated in your quote'
        )
      );
    })()
  );
}

export default QuoteStep1_Style;
