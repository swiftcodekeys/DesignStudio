// CheckoutPage.js — /checkout route
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrderSummary from './OrderSummary';
import TrustSignals from './TrustSignals';
import StripePaymentForm from './StripePaymentForm';
import TopNav from './TopNav';

var el = React.createElement;

var CYA_TEXT = 'I confirm the measurements, slope, gate placements, and site conditions I provided are based on my own inspection of my property. I understand: Grandview reviews every order within 24 hours but the accuracy of what I submitted is my responsibility. Ultra Aluminum fence is manufactured to order and cannot be returned for measurement errors or slope misclassification. Site conditions I haven\'t disclosed may affect install feasibility and are my responsibility to verify. Grandview\'s review is a courtesy double-check and does not constitute a professional site survey.';

function CheckoutPage() {
  var loc = useLocation();
  var nav = useNavigate();
  var quote = loc.state && loc.state.quote;

  var [acknowledged, setAcknowledged] = React.useState(false);
  var [summaryOpen, setSummaryOpen] = React.useState(false);

  if (!quote) {
    return el('div', { style: { padding: '4rem', textAlign: 'center' } },
      el('h2', null, 'No quote to check out'),
      el('p', null, 'Please complete a quote in the wizard first.'),
      el('button', {
        className: 'co-back-btn',
        onClick: function() { nav('/wizard'); },
      }, '← Back to wizard')
    );
  }

  var total = '$' + (quote.totalCents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return el('div', { className: 'co-page' },
    el(TopNav, null),

    // Mobile-only collapsible summary
    el('details', {
      className: 'co-mobile-summary',
      open: summaryOpen,
      onToggle: function(e) { setSummaryOpen(e.target.open); },
    },
      el('summary', { className: 'co-mobile-summary-trigger' },
        'Order summary — ' + total
      ),
      el(OrderSummary, { quote: quote })
    ),

    el('div', { className: 'co-grid' },
      // Desktop left column — order summary
      el('aside', { className: 'co-col-summary' },
        el(OrderSummary, { quote: quote }),
        el(TrustSignals, null)
      ),

      // Right column — payment
      el('section', { className: 'co-col-pay' },
        el('h2', { className: 'co-pay-heading' }, 'Payment'),

        el(StripePaymentForm, {
          totalCents: quote.totalCents,
          formattedTotal: total,
          acknowledged: acknowledged,
          quoteData: {
            quoteId: quote.id || null,
            zoneName: quote.zoneName,
          },
        }),

        el('label', { className: 'co-cya' },
          el('input', {
            type: 'checkbox',
            checked: acknowledged,
            onChange: function(e) { setAcknowledged(e.target.checked); },
          }),
          el('span', { className: 'co-cya-text' }, CYA_TEXT),
          el('span', {
            className: 'co-attorney-todo',
            title: 'Pending attorney review before production launch',
          }, ' [ATTORNEY REVIEW TODO]')
        )
      )
    )
  );
}

export default CheckoutPage;
