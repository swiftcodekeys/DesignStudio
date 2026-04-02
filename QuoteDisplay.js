// ============================================================================
// QuoteDisplay.js — Itemized quote with live grade/height selectors
// Calls calculateQuote() internally. No dealer costs, no margins.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { calculateQuote } from './pricingEngine';
import { STYLES } from './retailPricing';

var GRADE_LABELS = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
};

var GRADE_TOOLTIPS = {
  residential: 'Standard aluminum fence for homes. 5/8" pickets — backyards, pools, property lines.',
  commercial: 'Heavier-duty with 3/4" pickets and thicker rails. Businesses, HOAs, high-traffic areas.',
  industrial: 'Maximum strength with 1" pickets and 8\' panels. Government, schools, critical infrastructure.',
};

var TRUST_BADGES = [
  { label: 'Service-Disabled Veteran-Owned', icon: '\u2605' },
  { label: 'Made in the USA', icon: '\uD83C\uDDFA\uD83C\uDDF8' },
  { label: 'AAMA 2604 Certified', icon: '\u2713' },
  { label: 'Lifetime Structural Warranty', icon: '\u26E8' },
];

function formatCurrency(n) {
  if (n == null) return '$0.00';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatHeightLabel(h) {
  var ft = Math.floor(h / 12);
  var inches = h % 12;
  if (inches === 0) return h + '" (' + ft + ' ft)';
  return h + '"';
}

var QuoteDisplay = function(props) {
  var fenceConfig    = props.fenceConfig;
  var initialStyle   = props.initialStyle;
  var initialGrade   = props.initialGrade || 'residential';
  var initialHeight  = props.initialHeight;
  var onBuyNow       = props.onBuyNow;
  var onConsultation = props.onConsultation;

  var styleDef = STYLES[initialStyle];
  var availableGrades = styleDef ? styleDef.grades : ['residential'];

  // Ensure initial grade is valid
  var safeInitialGrade = availableGrades.indexOf(initialGrade) !== -1
    ? initialGrade : availableGrades[0];

  // Ensure initial height is valid
  var initialHeights = (styleDef && styleDef.availableHeights[safeInitialGrade]) || [48];
  var safeInitialHeight = initialHeights.indexOf(initialHeight) !== -1
    ? initialHeight : initialHeights[0];

  var gradeState = useState(safeInitialGrade);
  var selectedGrade = gradeState[0];
  var setSelectedGrade = gradeState[1];

  var heightState = useState(safeInitialHeight);
  var selectedHeight = heightState[0];
  var setSelectedHeight = heightState[1];

  var quoteState = useState(null);
  var quoteResult = quoteState[0];
  var setQuoteResult = quoteState[1];

  var calcState = useState(false);
  var isCalculating = calcState[0];
  var setIsCalculating = calcState[1];

  // Recalculate quote whenever grade or height changes
  useEffect(function() {
    setIsCalculating(true);
    var result = calculateQuote({
      style: initialStyle,
      height: selectedHeight,
      grade: selectedGrade,
      linearFeet: fenceConfig.linearFeet || 0,
      corners: fenceConfig.corners || 0,
      endCount: fenceConfig.endCount || 2,
      gates: fenceConfig.gates || [],
      postCap: fenceConfig.postCap || 'flat',
      puppyPickets: fenceConfig.puppyPickets || false,
      finials: fenceConfig.finials || null,
      circles: fenceConfig.circles || false,
      terrain: fenceConfig.terrain || 'flat',
    });
    setQuoteResult(result);
    setIsCalculating(false);
  }, [selectedGrade, selectedHeight, initialStyle, fenceConfig]);

  var availableHeights = (styleDef && styleDef.availableHeights[selectedGrade]) || [48];

  var handleGradeChange = function(newGrade) {
    var newHeights = (styleDef && styleDef.availableHeights[newGrade]) || [48];
    setSelectedGrade(newGrade);
    // Reset height if current selection is not valid for new grade
    if (newHeights.indexOf(selectedHeight) === -1) {
      setSelectedHeight(newHeights[0]);
    }
  };

  var handleHeightChange = function(newHeight) {
    setSelectedHeight(newHeight);
  };

  var handleBuyNow = function() {
    if (onBuyNow && quoteResult) {
      onBuyNow(quoteResult, selectedGrade, selectedHeight);
    }
  };

  var handleConsultation = function() {
    if (onConsultation && quoteResult) {
      onConsultation(quoteResult, selectedGrade, selectedHeight);
    }
  };

  // Error state
  if (quoteResult && quoteResult.error) {
    return (
      <div className="quote-display">
        <div className="quote-error">
          <p>{quoteResult.message}</p>
          <p>Call us at <strong>(855) FENCE-30</strong> | (855) 336-2330</p>
        </div>
      </div>
    );
  }

  if (!quoteResult) {
    return <div className="quote-display"><p>Calculating...</p></div>;
  }

  var styleName = styleDef ? styleDef.name : initialStyle;

  return (
    <div className="quote-display">
      <div className="quote-header">
        <h2 className="quote-title">Your Estimate</h2>
        <p className="quote-style-label">{styleName} \u2014 ProCoat (powder coat finish)</p>
      </div>

      {/* Grade selector */}
      {availableGrades.length > 1 && (
        <div className="quote-selector-group">
          <label className="quote-selector-label">GRADE</label>
          <div className="quote-selector-row">
            {availableGrades.map(function(g) {
              return (
                <button
                  key={g}
                  className={'quote-selector-btn' + (selectedGrade === g ? ' active' : '')}
                  onClick={function() { handleGradeChange(g); }}
                  title={GRADE_TOOLTIPS[g] || ''}
                >
                  {GRADE_LABELS[g]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Height selector */}
      <div className="quote-selector-group">
        <label className="quote-selector-label">HEIGHT</label>
        <div className="quote-selector-row">
          {availableHeights.map(function(h) {
            return (
              <button
                key={h}
                className={'quote-selector-btn' + (selectedHeight === h ? ' active' : '')}
                onClick={function() { handleHeightChange(h); }}
              >
                {formatHeightLabel(h)}
              </button>
            );
          })}
        </div>
      </div>

      {isCalculating && <div className="quote-calculating">Updating prices...</div>}

      {/* Line items */}
      <div className="quote-items">
        {quoteResult.items.map(function(item, idx) {
          return (
            <div key={idx} className="quote-item">
              <div className="quote-item-header">
                <span className="quote-item-label">{item.label}</span>
                <span className="quote-item-total">{formatCurrency(item.total)}</span>
              </div>
              <div className="quote-item-detail">
                {item.qty} {item.qty === 1 ? 'unit' : 'units'} &times; {formatCurrency(item.unitPrice)}
              </div>
              {item.note && (
                <div className="quote-item-note">{item.note}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtotal */}
      <div className="quote-subtotal">
        <span>Subtotal</span>
        <span className="quote-subtotal-amount">{formatCurrency(quoteResult.subtotal)}</span>
      </div>

      {/* Shipping & installation notes */}
      <div className="quote-notes">
        <p className="quote-note">Shipping calculated at checkout</p>
        <p className="quote-note">Installation not included &mdash; <em>request a free installer referral below</em></p>
      </div>

      {/* Warnings */}
      {quoteResult.warnings.length > 0 && (
        <div className="quote-warnings">
          {quoteResult.warnings.map(function(w, i) {
            return <p key={i} className="quote-warning">{w}</p>;
          })}
        </div>
      )}

      {/* CYA language */}
      <div className="quote-cya">
        <p>
          This estimate is based on the material quantities calculated from your
          layout. Actual quantities may vary based on site conditions and final
          measurements. All estimates are subject to confirmation before materials
          are ordered.
        </p>
        {quoteResult.hasSlope && (
          <p>
            Sloped terrain may require additional posts, racked panels, or
            stair-stepped sections. If your property has significant grade
            changes, we recommend a free consultation to confirm quantities.
          </p>
        )}
        <p>
          Final material quantities will be confirmed with you before any order
          is placed or payment processed. You&rsquo;ll receive a detailed quote
          within one business day of your request.
        </p>
      </div>

      {/* No-returns policy */}
      <div className="quote-policy">
        <p>
          All materials are custom-fabricated to your order specifications. We
          review every order before submitting to production &mdash; if we spot
          any discrepancies, we&rsquo;ll contact you before fabrication begins.
          Once submitted to production, orders cannot be cancelled or returned.
        </p>
      </div>

      {/* CTAs */}
      <div className="quote-ctas">
        <button
          className="quote-cta-primary"
          onClick={handleBuyNow}
          disabled={quoteResult.errors.length > 0}
        >
          Buy Now
        </button>
        <button
          className="quote-cta-secondary"
          onClick={handleConsultation}
        >
          Schedule Free Consultation
        </button>
      </div>

      {/* Trust badges */}
      <div className="quote-trust-badges">
        {TRUST_BADGES.map(function(badge, i) {
          return (
            <div key={i} className="quote-trust-badge">
              <span className="quote-trust-icon">{badge.icon}</span>
              <span className="quote-trust-label">{badge.label}</span>
            </div>
          );
        })}
      </div>

      <div className="quote-phone">
        Questions? Call <strong>(855) FENCE-30</strong> | (855) 336-2330
      </div>
    </div>
  );
};

export default QuoteDisplay;
