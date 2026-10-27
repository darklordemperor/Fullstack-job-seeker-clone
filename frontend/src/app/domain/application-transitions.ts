import { ApplicationStatus } from './application.model';

/** UI eligibility only; the server remains authoritative for permissions and concurrent updates. */
export function nextApplicationStatuses(status: ApplicationStatus): ApplicationStatus[] {
  switch (status) {
    case 'SUBMITTED': return ['REVIEWING', 'REJECTED'];
    case 'REVIEWING': return ['HIRED', 'REJECTED'];
    default: return [];
  }
}
