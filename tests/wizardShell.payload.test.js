import { describe, it, expect } from 'vitest';
import { buildCrmPayload } from '../WizardShell.js';

describe('buildCrmPayload', () => {
  it('includes grade when present', () => {
    const state = {
      zoneQuotes: { back: { config: { grade: 'commercial', height: 48 } } },
      contactInfo: { email: 'x@y.com' },
    };
    const payload = buildCrmPayload(state, 'quote');
    expect(payload.zones[0].grade).toBe('commercial');
  });

  it('includes installPlan when present', () => {
    const state = {
      zoneQuotes: { back: { config: {} } },
      installPlan: 'diy',
      contactInfo: { email: 'x@y.com' },
    };
    const payload = buildCrmPayload(state, 'quote');
    expect(payload.installPlan).toBe('diy');
  });

  it('includes EPQS + mapbox snapshot + terrain_flag from drawToolData', function() {
    var state = {
      selectedZones: ['back'],
      zoneQuotes: {
        back: {
          config: {},
          drawToolData: {
            epqsOverall: 'sloped',
            epqsConfidence: 'high',
            epqsMaxDeltaInches: 12,
            mapboxSnapshotUrl: 'data:image/png;base64,xxx',
          },
          quoteResult: { items: [], subtotal: 0 },
        },
      },
      stripePaymentIntentId: 'pi_test_1',
    };
    var payload = buildCrmPayload(state, 'order');
    expect(payload.epqs_data.overall).toBe('sloped');
    expect(payload.mapbox_snapshot_url).toContain('data:image');
    expect(payload.stripe_payment_intent_id).toBe('pi_test_1');
    expect(payload.terrain_flag).toBe('possible_slope');
  });
});
