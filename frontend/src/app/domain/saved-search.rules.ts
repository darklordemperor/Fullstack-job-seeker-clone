import { SavedSearchInput } from './saved-search.model';

export function savedSearchError(value: SavedSearchInput): string | null {
  if (!value.name.trim() || value.name.length > 80) return 'Enter a search name up to 80 characters.';
  if (value.query.length > 150 || value.location.length > 100) return 'Keep keywords within 150 characters and location within 100.';
  if ([value.salaryMin, value.salaryMax].some(amount => amount !== null && (!Number.isInteger(amount) || amount < 0 || amount > 2147483647))) return 'Salary must be a whole number from 0 to 2147483647.';
  if (value.salaryMin !== null && value.salaryMax !== null && value.salaryMin > value.salaryMax) return 'Minimum salary cannot exceed maximum salary.';
  if (value.salaryMin !== null || value.salaryMax !== null) {
    if (!/^[a-zA-Z]{3}$/.test(value.currency.trim())) return 'Enter a three-letter salary currency, such as THB.';
  } else if (!value.query.trim() && !value.location.trim()) return 'Choose a keyword, location or salary filter.';
  return null;
}
