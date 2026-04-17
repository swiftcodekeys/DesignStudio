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
});
