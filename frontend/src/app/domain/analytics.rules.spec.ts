import { analyticsDefaults, analyticsFilterError } from './analytics.rules';
describe('Analytics date filters', () => {
  const today = new Date('2024-12-31T23:00:00Z');
  const valid = { from: '2024-01-01', to: '2024-12-31', jobId: '' };
  it('uses UTC dates, accepts leap days and a 366-day inclusive range', () => {
    expect(analyticsDefaults(new Date('2024-03-01T00:00:00Z'))).toEqual({ from: '2024-02-01', to: '2024-03-01', jobId: '' });
    expect(analyticsDefaults().to).toBe(new Date().toISOString().slice(0, 10));
    expect(analyticsFilterError(valid, today)).toBeNull(); expect(analyticsFilterError({ ...valid, from: '2024-02-29', to: '2024-02-29', jobId: '00000000-0000-4000-8000-000000000001' }, today)).toBeNull();
    expect(analyticsFilterError(analyticsDefaults())).toBeNull();
  });
  it('rejects missing, impossible, malformed, reversed, future and oversized dates and invalid IDs', () => {
    for (const from of ['', 'invalid', '2024-02-30', '24-01-01']) expect(analyticsFilterError({ ...valid, from }, today)).toContain('valid start');
    expect(analyticsFilterError({ ...valid, to: '' }, today)).toContain('valid start');
    for (const value of [{ ...valid, from: '2025-01-01' }, { ...valid, to: '2025-01-01' }, { ...valid, from: '2023-12-31' }]) expect(analyticsFilterError(value, today)).toContain('366');
    expect(analyticsFilterError({ ...valid, jobId: 'bad' }, today)).toContain('valid job');
  });
});
