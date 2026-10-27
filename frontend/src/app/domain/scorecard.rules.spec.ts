import { emptyScorecardFeedback, scorecardError } from './scorecard.rules';
import { ScorecardFeedback } from './scorecard.model';
describe('Scorecard rules', () => {
  const complete: ScorecardFeedback = { technicalSkills: 1, communication: 3, problemSolving: 5, strengths: 'Evidence', concerns: '', recommendation: 'HIRE' };
  it('allows partial drafts and requires a complete final assessment', () => {
    expect(scorecardError(emptyScorecardFeedback(), false)).toBeNull();
    expect(scorecardError(complete, true)).toBeNull();
    expect(scorecardError({ ...complete, strengths: '', concerns: 'Concern' }, true)).toBeNull();
    for (const key of ['technicalSkills', 'communication', 'problemSolving', 'recommendation']) expect(scorecardError({ ...complete, [key]: null }, true)).toContain('Finalization');
    expect(scorecardError({ ...complete, strengths: ' ', concerns: ' ' }, true)).toContain('Finalization');
    expect(scorecardError({ ...complete, strengths: 'a'.repeat(2000) }, false)).toBeNull();
  });
  it('rejects out-of-range, fractional, nonfinite and oversized feedback', () => {
    for (const value of [0, 6, 2.5, NaN, Infinity]) expect(scorecardError({ ...complete, technicalSkills: value }, false)).toContain('Ratings');
    for (const key of ['strengths', 'concerns']) expect(scorecardError({ ...complete, [key]: 'a'.repeat(2001) }, false)).toContain('2000');
    expect(scorecardError({ ...complete, recommendation: 'BAD' as never }, false)).toContain('valid recommendation');
  });
});
