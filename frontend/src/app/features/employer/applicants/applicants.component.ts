import { Component, OnInit, inject, signal } from '@angular/core';
import { ResumeDownloadComponent } from '../../../shared/ui/resume-download.component';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApplicationStatus } from '../../../domain/application.model';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { ApplicantsStore } from './applicants.store';
import { nextApplicationStatuses } from '../../../domain/application-transitions';

@Component({
  selector: 'app-applicants', standalone: true,
  providers: [ApplicantsStore],
  imports: [PaginationComponent, FormsModule, DatePipe, RouterLink, ResumeDownloadComponent],
  template: `
    <main class="shell py-8">
      <a routerLink="/employer/manage-jobs" class="text-sm font-semibold text-blue-800">← Manage jobs</a>
      <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div><p class="text-sm font-semibold text-blue-700">Hiring workspace</p><h1 class="mt-1 text-3xl font-bold">Applicants</h1>
          <p class="mt-2 text-sm text-slate-600">{{ total() }} matching applications</p></div>
        <label class="grid gap-1 text-sm font-semibold">Pipeline stage
          <select class="rounded-md border border-slate-300 bg-white px-4 py-3" [ngModel]="status()" (ngModelChange)="filter($event)">
            <option value="">All stages</option><option value="SUBMITTED">Submitted</option><option value="REVIEWING">Reviewing</option>
            <option value="HIRED">Hired</option><option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>
      @if (error()) { <div role="alert" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{{ error() }} <button class="ml-3 underline" (click)="load(page())">Retry</button></div> }
      <section class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)]" [attr.aria-busy]="loading()">
        <div class="space-y-3">
          @if (loading()) { <p role="status" class="card-surface p-6">Loading applicants…</p> }
          @else {
            @for (applicant of applicants(); track applicant.id) {
              <button class="card-surface block w-full p-5 text-left hover:border-blue-600 focus-visible:outline-2 focus-visible:outline-blue-700"
                [class.border-blue-600]="detail()?.application?.id === applicant.id" (click)="review(applicant.id)">
                <span class="block text-base font-bold">{{ applicant.applicantName || 'Applicant' }}</span>
                <span class="mt-1 block break-all text-sm text-slate-500">{{ applicant.applicantEmail }}</span>
                <span class="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{{ applicant.status }}</span>
                <span class="mt-3 block text-xs text-slate-500">Applied {{ applicant.appliedAt | date:'mediumDate' }}</span>
              </button>
            } @empty { @if (!error()) { <div class="card-surface p-8 text-center"><h2 class="font-bold">No applicants in this stage</h2><p class="mt-2 text-sm text-slate-500">Applications will appear here when candidates apply.</p></div> } }
          }
          <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="load($event)" />
        </div>
        <aside class="card-surface p-6" aria-live="polite">
          @if (reviewLoading()) { <p role="status">Loading submitted profile…</p> }
          @else if (detail(); as current) {
            <h2 class="text-xl font-bold">{{ current.application.applicantName || 'Applicant' }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ current.application.jobTitle }}</p>
            @if (current.resume; as resume) { <div class="mt-4"><p class="mb-2 text-xs font-semibold text-slate-600">PDF preserved at submission</p><app-resume-download [resume]="resume" [applicationId]="current.application.id" [employer]="true" /></div> }
            @if (current.submission; as submission) {
              <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-blue-700">Profile submitted {{ submission.capturedAt | date:'mediumDate' }}</p>
              <p class="mt-3 whitespace-pre-line text-sm leading-6">{{ submission.profile.summary || 'No summary supplied.' }}</p>
              <p class="mt-3 break-all text-sm text-slate-600">{{ submission.applicantEmail }} · {{ submission.profile.phone || 'No phone supplied' }}</p>
              <div class="mt-4 flex flex-wrap gap-2">@for (skill of submission.profile.skills; track $index) { <span class="rounded-full bg-slate-100 px-3 py-1 text-xs">{{ skill.name }}</span> }</div>
              @if (submission.profile.resumeUrl) { <a [href]="submission.profile.resumeUrl" target="_blank" rel="noopener noreferrer" class="mt-5 inline-block font-semibold text-blue-700 underline">Open submitted résumé link</a> }
              @for (experience of submission.profile.workExperiences; track $index) { <p class="mt-3 text-sm"><strong>{{ experience.title }}</strong> · {{ experience.company }}</p> }
              @for (education of submission.profile.educations; track $index) { <p class="mt-3 text-sm">{{ education.degree }} · {{ education.institution }}</p> }
            } @else { <p class="mt-5 rounded bg-amber-50 p-3 text-sm">This older application has no submitted-profile snapshot.</p> }
            @if (current.application.status === 'SUBMITTED' || current.application.status === 'REVIEWING') {
              <a routerLink="/employer/interviews" [queryParams]="{ applicationId: current.application.id }" class="mt-5 inline-block rounded border border-blue-800 px-4 py-3 text-sm font-bold text-blue-800">Schedule interview</a>
            }
            <h3 class="mt-7 font-bold">Status history</h3>
            <ol class="mt-3 space-y-3 border-l-2 border-blue-100 pl-4">
              @for (event of current.timeline; track event.id) {
                <li class="text-sm"><strong>{{ event.toStatus }}</strong><span class="ml-2 text-xs text-slate-500">{{ event.createdAt | date:'short' }}</span>
                  @if (event.internalNote) { <p class="mt-1 whitespace-pre-line text-slate-600">{{ event.internalNote }}</p> }
                </li>
              } @empty { <li class="text-sm text-slate-500">No historical events recorded.</li> }
            </ol>
            @if (nextStatuses(current.application.status).length) {
              <form class="mt-6 grid gap-3 border-t pt-5" (ngSubmit)="move()">
                <label class="grid gap-1 text-sm font-semibold">Next stage
                  <select name="nextStatus" required class="rounded border p-3" [ngModel]="nextStatus()" (ngModelChange)="nextStatus.set($event)">
                    <option value="">Select stage</option>@for (next of nextStatuses(current.application.status); track next) { <option [value]="next">{{ next }}</option> }
                  </select>
                </label>
                <label class="grid gap-1 text-sm font-semibold">Internal note
                  <textarea name="reason" required maxlength="2000" class="min-h-24 rounded border p-3" [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
                </label>
                <p class="text-xs text-slate-500">Only your hiring team can see this note.</p>
                <button class="rounded-md bg-blue-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" [disabled]="saving() || !nextStatus() || !reason().trim()">Update stage</button>
              </form>
            }
          } @else { <h2 class="font-bold">Select an applicant</h2><p class="mt-2 text-sm text-slate-500">Review their submitted profile and move them through your hiring process.</p> }
        </aside>
      </section>
    </main>`,
})
export class ApplicantsComponent implements OnInit {
  private readonly store = inject(ApplicantsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly jobId = this.route.snapshot.paramMap.get('id')!;
  protected readonly applicants = this.store.applicants;
  protected readonly detail = this.store.detail;
  protected readonly status = this.store.status;
  protected readonly page = this.store.page;
  protected readonly total = this.store.total;
  protected readonly totalPages = this.store.totalPages;
  protected readonly loading = this.store.loading;
  protected readonly reviewLoading = this.store.reviewLoading;
  protected readonly saving = this.store.saving;
  protected readonly error = this.store.error;
  protected readonly nextStatus = signal<ApplicationStatus | ''>('');
  protected readonly reason = signal('');
  protected readonly nextStatuses = nextApplicationStatuses;
  ngOnInit(): void {
    void this.load(0);
    const applicationId=this.route.snapshot.queryParamMap?.get('applicationId');
    if (applicationId) void this.review(applicationId);
  }
  protected filter(status: string): void {
    this.clearForm();
    void this.store.filter(this.jobId, status);
  }
  protected load(page: number): Promise<void> { return this.store.load(this.jobId, page); }
  protected review(id: string): Promise<void> { this.clearForm(); return this.store.review(id); }
  protected async move(): Promise<void> {
    const selected = this.detail()?.application.id;
    const next = this.nextStatus(), reason = this.reason();
    const saved = await this.store.move(this.jobId, next, reason);
    if (saved && this.detail()?.application.id === selected && this.nextStatus() === next && this.reason() === reason) this.clearForm();
  }
  private clearForm(): void { this.nextStatus.set(''); this.reason.set(''); }
}
