/** Only known internal workflow destinations can be opened from an inbox item. */
export function notificationTarget(href: string): { path: string; queryParams: Record<string, string> } | null {
  const uuid = '[0-9a-fA-F-]{36}';
  if (new RegExp(`^/jobs/${uuid}$`).test(href)) return {path:href,queryParams:{}};
  const application = href.match(new RegExp(`^(/employer/applicants/${uuid}|/job-seeker/my-applications)\\?applicationId=(${uuid})$`));
  if (application) return { path: application[1], queryParams: { applicationId: application[2] } };
  const interview = href.match(new RegExp(`^(/employer/interviews|/job-seeker/interviews)\\?interviewId=(${uuid})$`));
  return interview ? { path: interview[1], queryParams: { interviewId: interview[2] } } : null;
}
