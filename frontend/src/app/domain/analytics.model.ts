import { ApplicationStatus } from './application.model';
export interface AnalyticsFilters { from: string; to: string; jobId: string; }
export interface HiringAnalytics {
  from: string; to: string; asOf: string; jobId: string | null; applications: number; applicationsWithoutSubmissionHistory: number;
  funnel: { status: 'SUBMITTED' | 'REVIEWING' | 'HIRED'; applications: number; conversionPercent: number | null }[];
  currentStatuses: { status: ApplicationStatus; applications: number }[];
  timeToHire: { sampleSize: number; averageDays: number | null; medianDays: number | null; hiredWithoutTimestamp: number };
}
