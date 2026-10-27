import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { JOB_REPOSITORY } from '../../../core/di/repository.tokens';
import { JobListStore } from './job-list.store';
import { Job } from '../../../domain/job.model';
import { PagedResponse } from '../../../domain/page.model';

describe('JobListStore', () => {
  it('ignores an older response, preserves filters on paging, and clears stale results on failure', () => {
    const first = new Subject<PagedResponse<Job>>(), second = new Subject<PagedResponse<Job>>();
    const repo = { fetch: vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second) };
    TestBed.configureTestingModule({ providers: [JobListStore, { provide: JOB_REPOSITORY, useValue: repo }] });
    const store = TestBed.inject(JobListStore);
    store.loadData({ q: 'old', page: 0, size: 8 }); store.loadData({ q: 'Angular', location: 'Bangkok', page: 0, size: 8 });
    const job = { id: 'new', title: 'Engineer' } as Job;
    second.next({ content: [job], totalElements: 10, totalPages: 2, page: 0 });
    first.next({ content: [], totalElements: 0, totalPages: 1, page: 0 });
    expect(store.selected()?.id).toBe('new'); expect(store.hasJobs()).toBe(true);
    repo.fetch.mockReturnValue(throwError(() => new Error('Offline'))); store.loadPage(1);
    expect(repo.fetch).toHaveBeenLastCalledWith({ q: 'Angular', location: 'Bangkok', page: 1, size: 8 });
    expect(store.jobs()).toEqual([]); expect(store.selected()).toBeNull(); expect(store.error()).toBe('Offline');
    repo.fetch.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 1, page: 0 })); store.loadPage(0);
    expect(store.error()).toBeNull(); expect(store.hasJobs()).toBe(false); expect(store.loading()).toBe(false);
  });
});
