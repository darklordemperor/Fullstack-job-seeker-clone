import { AnalyticsFilters } from './analytics.model';
export function analyticsDefaults(today = new Date()): AnalyticsFilters {
  const to = today.toISOString().slice(0, 10), from = new Date(to + 'T00:00:00Z'); from.setUTCDate(from.getUTCDate() - 29);
  return { from: from.toISOString().slice(0, 10), to, jobId: '' };
}
export function analyticsFilterError(filters: AnalyticsFilters, today = new Date()): string | null {
  const parse = (value: string) => { const time = Date.parse(value + 'T00:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN; };
  const from = parse(filters.from), to = parse(filters.to);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 'Choose valid start and end dates.';
  if (from > to || to > parse(today.toISOString().slice(0, 10)) || (to - from) / 86400000 > 365) return 'Choose an ordered UTC date range of at most 366 days, ending no later than today.';
  if (filters.jobId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.jobId)) return 'Choose a valid job.';
  return null;
}
