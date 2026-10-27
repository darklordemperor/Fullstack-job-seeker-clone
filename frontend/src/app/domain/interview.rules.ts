import { InterviewProposal } from './interview.model';
export function interviewProposalError(value: InterviewProposal, now = Date.now()): string | null {
  if (!value.location.trim() || value.location.trim().length > 1000) return 'Enter a location or meeting link (maximum 1000 characters).';
  if (value.mode === 'ONLINE') {
    try { const url = new URL(value.location); if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return 'Enter a valid HTTPS meeting link without embedded credentials.'; }
    catch { return 'Enter a valid HTTPS meeting link.'; }
  }
  try { new Intl.DateTimeFormat('en', { timeZone: value.timezone }); } catch { return 'Choose a valid timezone.'; }
  if (value.slots.length < 1 || value.slots.length > 3) return 'Offer between one and three time slots.';
  for (const slot of value.slots) {
    const start = Date.parse(slot.startsAt), end = Date.parse(slot.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= now || start > now + 365*86400000 || end-start < 900000 || end-start > 14400000) return 'Each slot must start in the next 365 days and last 15 minutes to 4 hours.';
  }
  for (let i=0; i<value.slots.length; i++) for (let j=i+1; j<value.slots.length; j++) {
    if (Date.parse(value.slots[i].startsAt) < Date.parse(value.slots[j].endsAt) && Date.parse(value.slots[j].startsAt) < Date.parse(value.slots[i].endsAt)) return 'Proposed slots must not overlap.';
  }
  return null;
}
export function localDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
export function toUtc(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || localDateTime(value) !== value) throw new Error('Enter a valid local date and time. Some times do not exist when daylight saving changes.');
  return date.toISOString();
}
