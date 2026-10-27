import { provideRepositories } from '../di/repository.providers';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { SessionService } from '../auth/session.service';
import { jwtInterceptor } from './jwt.interceptor';

function tokens(marker: string, expired = false) {
  const payload = btoa(JSON.stringify({ sub: 'user-id', email: 'candidate@example.com', role: 'ROLE_JOB_SEEKER', purpose: 'access', exp: Math.floor(Date.now()/1000) + (expired ? -60 : 900) }));
  return { accessToken: `header.${payload}.${marker}`, refreshToken: `refresh-${marker}`, tokenType: 'Bearer' as const };
}
describe('JWT session handling', () => {
  let http: HttpClient, controller: HttpTestingController, session: SessionService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRepositories(),{ provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } }, provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient); controller = TestBed.inject(HttpTestingController); session = TestBed.inject(SessionService);
  });
  afterEach(() => { controller.verify(); localStorage.clear(); });
  it('shares one refresh across concurrent expired-token requests', () => {
    session.accept(tokens('old', true));
    http.get('/api/job-seeker/profile').subscribe();
    http.get('/api/job-seeker/settings').subscribe();
    const refresh = controller.expectOne('/api/auth/refresh-token');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-old' });
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ data: tokens('new') });
    const requests = controller.match(req => req.url.startsWith('/api/job-seeker/'));
    expect(requests).toHaveLength(2);
    for (const request of requests) { expect(request.request.headers.get('Authorization')).toBe(`Bearer ${tokens('new').accessToken}`); request.flush({}); }
    expect(session.current()?.refreshToken).toBe('refresh-new');
  });
  it('clears the session when refresh fails', () => {
    session.accept(tokens('old', true));
    const error = vi.fn();
    http.get('/api/job-seeker/profile').subscribe({ error });
    controller.expectOne('/api/auth/refresh-token').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.current()).toBeNull(); expect(error).toHaveBeenCalledOnce();
  });
  it('never attaches tokens to external URLs or auth endpoints', () => {
    session.accept(tokens('valid'));
    http.get('https://example.com/resource').subscribe();
    http.post('/api/auth/login', {}).subscribe();
    for (const request of controller.match(() => true)) { expect(request.request.headers.has('Authorization')).toBe(false); request.flush({}); }
  });
  it('retries a rejected access token once after refreshing', () => {
    session.accept(tokens('old'));
    http.get('/api/job-seeker/profile').subscribe();
    controller.expectOne('/api/job-seeker/profile').flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/api/auth/refresh-token').flush({ data: tokens('new') });
    const retried = controller.expectOne('/api/job-seeker/profile');
    expect(retried.request.headers.get('Authorization')).toBe(`Bearer ${tokens('new').accessToken}`);
    retried.flush({});
  });
  it('does not restore legacy demo tokens as authenticated sessions', () => {
    localStorage.setItem('jobsdb-session', JSON.stringify({ accessToken: 'demo-token-admin', user: {}, role: 'ROLE_ADMIN' }));
    const restored = TestBed.runInInjectionContext(() => new SessionService());
    expect(restored.current()).toBeNull();
  });
});
