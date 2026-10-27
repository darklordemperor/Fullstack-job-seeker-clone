import { WorkExperience } from './job-seeker-profile.model';

export function workExperienceError(items: WorkExperience[]): string | null {
  if (items.length > 100) return 'You can add up to 100 work experiences.';
  for (const [index, item] of items.entries()) {
    const prefix = `Experience ${index + 1}: `;
    if (!item.company.trim() || !item.title.trim()) return prefix + 'company and job title are required.';
    if (item.company.trim().length > 180 || item.title.trim().length > 180) return prefix + 'company and job title must be 180 characters or fewer.';
    for (const value of [item.startDate, item.endDate]) {
      if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
        return prefix + 'enter a valid date.';
      }
    }
    if (item.startDate && item.endDate && item.endDate < item.startDate) return prefix + 'end date must not precede start date.';
  }
  return null;
}
