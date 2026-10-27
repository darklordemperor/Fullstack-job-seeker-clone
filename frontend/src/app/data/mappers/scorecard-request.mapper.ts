import { ScorecardFeedback } from '../../domain/scorecard.model';
export function toScorecardRequest(expectedVersion: number, feedback: ScorecardFeedback) {
  return { expectedVersion, feedback: {
    technicalSkills: feedback.technicalSkills, communication: feedback.communication, problemSolving: feedback.problemSolving,
    strengths: feedback.strengths.trim(), concerns: feedback.concerns.trim(), recommendation: feedback.recommendation,
  } };
}
