import { ScorecardFeedback } from './scorecard.model';
export const emptyScorecardFeedback = (): ScorecardFeedback => ({ technicalSkills: null, communication: null, problemSolving: null, strengths: '', concerns: '', recommendation: null });
export function scorecardError(value: ScorecardFeedback, finalize: boolean): string | null {
  const ratings = [value.technicalSkills, value.communication, value.problemSolving];
  if (ratings.some(r => r !== null && (!Number.isInteger(r) || r < 1 || r > 5))) return 'Ratings must be between 1 and 5.';
  if (value.strengths.trim().length > 2000 || value.concerns.trim().length > 2000) return 'Each feedback note must be 2000 characters or fewer.';
  if (value.recommendation !== null && !['STRONG_HIRE', 'HIRE', 'HOLD', 'NO_HIRE'].includes(value.recommendation)) return 'Choose a valid recommendation.';
  if (finalize && (ratings.some(r => r === null) || !value.recommendation || (!value.strengths.trim() && !value.concerns.trim())))
    return 'Finalization requires all three ratings, a recommendation and at least one strengths or concerns note.';
  return null;
}
