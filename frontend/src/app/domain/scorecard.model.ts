export type ScorecardRecommendation = 'STRONG_HIRE' | 'HIRE' | 'HOLD' | 'NO_HIRE';
export interface ScorecardFeedback {
  technicalSkills: number | null; communication: number | null; problemSolving: number | null;
  strengths: string; concerns: string; recommendation: ScorecardRecommendation | null;
}
export interface Scorecard {
  interviewId: string; version: number; status: 'DRAFT' | 'FINALIZED'; feedback: ScorecardFeedback;
  updatedAt: string; finalizedAt: string | null;
}
