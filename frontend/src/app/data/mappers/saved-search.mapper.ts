import { SavedSearchInput } from '../../domain/saved-search.model';
export function savedSearchRequest(input: SavedSearchInput): SavedSearchInput {
  return { name: input.name.trim(), query: input.query.trim(), location: input.location.trim(),
    salaryMin: input.salaryMin, salaryMax: input.salaryMax,
    currency: input.salaryMin === null && input.salaryMax === null ? '' : input.currency.trim().toUpperCase() };
}
