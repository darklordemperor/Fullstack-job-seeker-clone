export interface SavedJob {
  jobId: string;
  title: string;
  companyName: string;
  location: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  savedAt: string;
}
