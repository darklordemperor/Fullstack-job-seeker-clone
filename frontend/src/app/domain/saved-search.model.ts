export interface SavedSearchInput {
  name: string; query: string; location: string;
  salaryMin: number | null; salaryMax: number | null; currency: string;
}
export interface SavedSearch extends SavedSearchInput { id: string; enabled: boolean; createdAt: string; }
