import { notificationTarget } from './notification-target';
describe('Notification destinations', () => {
  const id='11111111-1111-4111-8111-111111111111';
  it('opens a matching job without accepting extra redirect parameters',()=>{
    expect(notificationTarget(`/jobs/${id}`)).toEqual({path:`/jobs/${id}`,queryParams:{}});
    expect(notificationTarget(`/jobs/${id}?redirect=https://example.com`)).toBeNull();
  });
  it.each([`/employer/applicants/${id}`, '/job-seeker/my-applications'])('opens an exact application from %s',path => {
    expect(notificationTarget(`${path}?applicationId=${id}`)).toEqual({path,queryParams:{applicationId:id}});
  });
  it.each(['/employer/interviews','/job-seeker/interviews'])('opens an exact interview from %s',path => {
    expect(notificationTarget(`${path}?interviewId=${id}`)).toEqual({path,queryParams:{interviewId:id}});
  });
  it.each(['https://example.com','//example.com','javascript:alert(1)','/admin/users','/job-seeker/interviews?interviewId=bad',`/job-seeker/interviews?interviewId=${id}&redirect=https://example.com`])('rejects an unexpected target %s',href => {
    expect(notificationTarget(href)).toBeNull();
  });
});
