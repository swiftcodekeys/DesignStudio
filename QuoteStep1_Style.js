// QuoteStep1_Style.js — Style & Config step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React from 'react';
import { Check, Info } from '@phosphor-icons/react';
import InfoPopup from './InfoPopup';

// ---- Style image mappings (gate_styles folder) ----
var STYLE_IMAGES = {
  'horizon':        'assets/ifence_previews/gate_styles/san_marino_15.png',
  'haven':          'assets/ifence_previews/gate_styles/boca_grande_45.png',
  'charleston':     'assets/ifence_previews/gate_styles/bella_vista_48.png',
  'vanguard':       'assets/ifence_previews/gate_styles/sanibel_12.png',
  'savannah':       'assets/ifence_previews/gate_styles/bella_terra_51.png',
  'horizon-pro':    'assets/ifence_previews/gate_styles/santa_monica_9.png',
  'charleston-pro': 'assets/ifence_previews/gate_styles/charleston_pro.png',
};

// ---- Style definitions per grade ----
var STYLES_BY_GRADE = {
  residential: [
    { id: 'horizon',        name: 'Horizon',        badge: 'POPULAR' },
    { id: 'haven',          name: 'Haven',           badge: 'POOL' },
    { id: 'charleston',     name: 'Charleston',      badge: 'POPULAR' },
    { id: 'vanguard',       name: 'Vanguard',        badge: null },
    { id: 'savannah',       name: 'Savannah',        badge: null },
    { id: 'horizon-pro',    name: 'Horizon Pro',     badge: 'PUPPY READY' },
    { id: 'charleston-pro', name: 'Charleston Pro',  badge: null },
  ],
  commercial: [
    { id: 'horizon',        name: 'Horizon',         badge: 'POPULAR' },
    { id: 'charleston',     name: 'Charleston',      badge: 'POPULAR' },
    { id: 'vanguard',       name: 'Vanguard',        badge: null },
    { id: 'horizon-pro',    name: 'Horizon Pro',     badge: null },
    { id: 'charleston-pro', name: 'Charleston Pro',  badge: null },
  ],
  industrial: [
    { id: 'horizon',        name: 'Horizon',         badge: null },
    { id: 'charleston',     name: 'Charleston',      badge: null },
    { id: 'horizon-pro',    name: 'Horizon Pro',     badge: null },
    { id: 'charleston-pro', name: 'Charleston Pro',  badge: null },
  ],
};

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

function selCard(selected, onClick, children, className) {
  return el('button', {
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
  var availableStyles = STYLES_BY_GRADE[grade] || STYLES_BY_GRADE.residential;
  var availableHeights = HEIGHTS_BY_GRADE[grade] || HEIGHTS_BY_GRADE.residential;

  // If current style not available for grade, clear it
  var styleValid = !data.style || availableStyles.some(function(s) { return s.id === data.style; });
  if (!styleValid && data.style) {
    // will be cleared on next render cycle
    setTimeout(function() { update({ style: '' }); }, 0);
  }

  // If current height not available for grade, pick closest
  var heightValid = availableHeights.indexOf(data.height) >= 0;
  if (!heightValid && data.height) {
    var closest = availableHeights.reduce(function(prev, curr) {
      return Math.abs(curr - data.height) < Math.abs(prev - data.height) ? curr : prev;
    });
    setTimeout(function() { update({ height: closest }); }, 0);
  }

  // Pool compliance: lock flush bottom, suggest Haven
  var poolLocked = !!(poolCompliance && poolCompliance.poolBarrier);

  // Pro spacing tip
  var isProSpacing = data.spacing === 'pro';

  // Racking warning: puppy + butterflies/scrolls
  var hasButterfliesOrScrolls = !!(data.extras && (data.extras.butterflies || data.extras.scrolls));
  var showRackingWarning = data.puppyPickets && hasButterfliesOrScrolls;

  return el('div', { className: 'qs1-container' },

    // ---- Grade ----
    sectionHeader('Grade', {
      title: 'Fence Grade',
      text: 'Residential is for homes. Commercial uses heavier gauge aluminum for business properties. Industrial is the heaviest duty for high-security applications.',
    }),
    el('div', { className: 'qs1-card-row' },
      GRADES.map(function(g) {
        return selCard(grade === g.id, function() { update({ grade: g.id }); },
          el('div', { key: g.id },
            el('div', { className: 'qs1-card-title' }, g.name),
            el('div', { className: 'qs1-card-desc' }, g.desc)
          ),
          null
        );
      })
    ),

    // ---- Fence Type ----
    sectionHeader('Fence Type'),
    el('div', { className: 'qs1-toggle-row' },
      el('button', {
        className: 'qs1-toggle' + (data.fenceType === 'ornamental' ? ' active' : ''),
        onClick: function() { update({ fenceType: 'ornamental' }); },
      }, 'Ornamental'),
      el('button', {
        className: 'qs1-toggle' + (data.fenceType === 'privacy' ? ' active' : ''),
        onClick: function() { update({ fenceType: 'privacy' }); },
      }, 'Privacy')
    ),

    // ---- Style ----
    sectionHeader('Style', {
      title: 'Fence Styles',
      text: 'Each style has a distinct look. Horizon is a classic flat-top. Charleston features decorative spear-top pickets. Haven is specifically designed for pool code compliance.',
    }),
    poolLocked ? el('div', { className: 'qs1-pool-note' },
      'Pool project detected. Haven style is recommended for code compliance.'
    ) : null,
    el('div', { className: 'qs1-style-grid' },
      availableStyles.map(function(style) {
        var imgSrc = STYLE_IMAGES[style.id] || '';
        return el('button', {
          key: style.id,
          className: 'qs1-style-card' + (data.style === style.id ? ' selected' : ''),
          onClick: function() { update({ style: style.id }); },
        },
          imgSrc ? el('img', { src: imgSrc, alt: style.name, className: 'qs1-style-img' }) : null,
          el('div', { className: 'qs1-style-name' }, style.name),
          style.badge ? el('span', { className: 'qs1-badge qs1-badge-' + style.badge.toLowerCase().replace(/\s+/g, '-') }, style.badge) : null,
          data.style === style.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 14, weight: 'bold' })) : null
        );
      })
    ),

    // ---- Picket Spacing ----
    sectionHeader('Picket Spacing', {
      title: 'Picket Spacing',
      text: 'Standard spacing has pickets at regular intervals. Pro spacing adds additional pickets between each standard picket for a denser look and enhanced security.',
      imageSrc: 'assets/ifence_previews/config_options/extreme_spacing_116.png',
    }),
    el('div', { className: 'qs1-card-row' },
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
    ),
    isProSpacing ? el('div', { className: 'qs1-tip' },
      'Pro spacing already includes extra pickets — puppy pickets may not be needed.'
    ) : null,

    // ---- Puppy Pickets ----
    sectionHeader('Puppy Pickets', {
      title: 'Puppy Pickets',
      text: 'Smaller pickets added to the bottom section of your fence to prevent small pets from squeezing through. Multiple classic styles available with decorative finials.',
    }),
    el('label', { className: 'qs1-checkbox-row' },
      el('input', {
        type: 'checkbox',
        checked: !!data.puppyPickets,
        onChange: function(e) {
          var checked = e.target.checked;
          update({ puppyPickets: checked, puppyStyle: checked ? (data.puppyStyle || 'standard') : '' });
        },
      }),
      el('span', null, 'Add puppy pickets to my panels')
    ),
    data.puppyPickets ? el('div', { className: 'qs1-puppy-grid' },
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
          className: 'qs1-height-card' + (data.height === h ? ' selected' : ''),
          onClick: function() { update({ height: h }); },
        },
          el('div', { className: 'qs1-height-val' }, h + '"'),
          el('div', { className: 'qs1-height-ft' }, (h / 12).toFixed(1) + ' ft')
        );
      })
    ),

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
          el('div', { key: r },
            el('div', { className: 'qs1-card-title' }, r + '-Rail'),
            r === 3 ? el('div', { className: 'qs1-card-desc' }, 'Standard') : null
          )
        );
      })
    ),

    // ---- Bottom Rail ----
    sectionHeader('Bottom Rail', {
      title: 'Bottom Rail Position',
      text: 'Standard bottom rail sits above ground level. Flush bottom rail sits at ground level, required for pool code compliance to prevent gaps.',
    }),
    poolLocked ? el('div', { className: 'qs1-pool-note' },
      'Pool compliance requires flush bottom rail — auto-selected.'
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
    )
  );
}

export default QuoteStep1_Style;
