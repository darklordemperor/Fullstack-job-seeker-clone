import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JobRepository } from './job.repository';
import { EmployerRepository } from './employer.repository';
import { AdminRepository } from './admin.repository';
import { JobSeekerRepository } from './job-seeker.repository';

describe('Live API repositories', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads paginated saved summaries with the requested page and preserves closed jobs', () => {
    const next = vi.fn(); TestBed.inject(JobSeekerRepository).savedJobsPage(2).subscribe(next);
    const request = http.expectOne(req => req.url === '/api/job-seeker/saved-jobs/page');
    expect(request.request.params.get('page')).toBe('2'); expect(request.request.params.get('size')).toBe('8');
    const data = { content: [{ jobId: 'id', status: 'CLOSED' }], totalElements: 17, totalPages: 3, page: 2 };
    request.flush({ success: true, data }); expect(next).toHaveBeenCalledWith(data);
  });
  it('maps profile updates to writable request fields only', () => {
    const profile = { fullName: 'Alex', expectedSalary: { min: 100, max: 200, currency: 'THB' },
      profileImageUrl: '/uploads/old.png', userId: 'read-only', internalFlag: true,
      skills: [{ name: 'TypeScript', internalId: 'hidden' }], workExperiences: [], educations: [], languages: [], licenses: [] };
    TestBed.inject(JobSeekerRepository).updateProfile(profile).subscribe();
    const request = http.expectOne('/api/job-seeker/profile');
    expect(request.request.body.expectedSalaryMin).toBe(100);
    expect(request.request.body.expectedSalaryMax).toBe(200);
    expect(request.request.body.salaryCurrency).toBe('THB');
    for (const key of ['userId', 'profileImageUrl', 'expectedSalary', 'internalFlag']) expect(request.request.body).not.toHaveProperty(key);
    expect(request.request.body.skills[0]).not.toHaveProperty('internalId');
    request.flush({ data: profile });
  });
  it('preserves empty job results and sends filters', () => {
    let result: unknown;
    TestBed.inject(JobRepository).fetch({ q: 'No match', location: 'Bangkok', page: 2 }).subscribe(value => result = value);
    const request = http.expectOne(req => req.url === '/api/jobs');
    expect(request.request.params.get('q')).toBe('No match');
    expect(request.request.params.get('page')).toBe('2');
    const data = { content: [], totalElements: 0, totalPages: 1, page: 2 };
    request.flush({ success: true, data });
    expect(result).toEqual(data);
  });
  it('propagates missing jobs instead of showing a sample job', () => {
    let status: number | undefined;
    TestBed.inject(JobRepository).findById('missing').subscribe({ error: error => status = error.status });
    http.expectOne('/api/jobs/missing').flush({}, { status: 404, statusText: 'Not found' });
    expect(status).toBe(404);
  });
  it('does not turn failed company saves into successes', () => {
    const success = vi.fn(), error = vi.fn();
    TestBed.inject(EmployerRepository).updateProfile({ companyName: 'Example' }).subscribe({ next: success, error });
    http.expectOne('/api/employer/profile').flush({}, { status: 500, statusText: 'Failed' });
    expect(success).not.toHaveBeenCalled(); expect(error).toHaveBeenCalledOnce();
  });
  it('does not turn failed moderation into success', () => {
    const success = vi.fn(), error = vi.fn();
    TestBed.inject(AdminRepository).deleteApplication('application', 'reason').subscribe({ next: success, error });
    const request = http.expectOne('/api/admin/applications/application');
    expect(request.request.body).toEqual({ reason: 'reason' });
    request.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(success).not.toHaveBeenCalled(); expect(error).toHaveBeenCalledOnce();
  });
  it('preserves a candidate with no applications', () => {
    const next = vi.fn();
    TestBed.inject(JobSeekerRepository).myApplications().subscribe(next);
    http.expectOne('/api/applications/my').flush({ success: true, data: [] });
    expect(next).toHaveBeenCalledWith([]);
  });
  it('sends expected status and internal note for a hiring transition', () => {
    TestBed.inject(EmployerRepository).moveApplicant('id', 'SUBMITTED', 'REVIEWING', 'Reviewed').subscribe();
    const request = http.expectOne('/api/employer/applications/id/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ expectedStatus: 'SUBMITTED', status: 'REVIEWING', reason: 'Reviewed' });
    request.flush({ data: { id: 'id', status: 'REVIEWING' } });
  });
});
