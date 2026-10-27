import { Component, OnInit, inject, signal } from '@angular/core';
import { ResumeDownloadComponent } from '../../../shared/ui/resume-download.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { JobApplication } from '../../../domain/application.model';
import { ApplicationDetail } from '../../../domain/hiring.model';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';

@Component({
  selector: 'app-my-applications', standalone: true, imports: [PaginationComponent, DatePipe, RouterLink, ResumeDownloadComponent],
  template: `
    <main class="shell max-w-4xl py-8">
      <p class="text-sm font-semibold text-blue-700">Your career workspace</p>
      <h1 class="mt-1 text-3xl font-bold">My applications</h1>
      <p class="mt-2 text-sm text-slate-600">Track your submitted applications and hiring progress.</p>
      <a routerLink="/job-seeker/interviews" class="mt-4 inline-block rounded-lg border px-4 py-3 text-sm font-bold">View interview invitations →</a>
      @if (linkedDetail(); as selected) {
        <section class="card-surface mt-5 border-blue-200 bg-blue-50/40 p-5" aria-label="Application from notification">
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-800">Application update</p><h2 class="mt-2 text-xl font-bold">{{ selected.application.jobTitle }}</h2>
          <p class="mt-2 text-sm">{{ selected.application.companyName }} · {{ selected.application.status }}</p>
          @if (selected.resume; as resume) { <div class="mt-3"><app-resume-download [resume]="resume" [applicationId]="selected.application.id" /></div> }
          <ol class="mt-4 space-y-2 border-l-2 border-blue-200 pl-4">@for (event of selected.timeline; track event.id) { <li class="text-sm"><strong>{{ event.toStatus }}</strong> · {{ event.createdAt | date:'medium' }}</li> } @empty { <li class="text-sm">No historical events recorded for this older application.</li> }</ol>
        </section>
      }
      @if (error()) { <p role="alert" class="mt-5 rounded bg-red-50 p-4 text-red-800">{{ error() }} <button class="underline" (click)="load(page())">Retry</button></p> }
      @if (loading()) { <p role="status" class="mt-6">Loading applications…</p> }
      @else {
        <div class="mt-6 grid gap-4">
          @for (application of applications(); track application.id) {
            <article class="card-surface p-5">
              <div class="flex flex-wrap justify-between gap-4">
                <div><h2 class="font-bold">{{ application.jobTitle }}</h2><p class="mt-1 text-sm text-slate-600">{{ application.companyName }}</p>
                <p class="mt-2 text-xs text-slate-500">Applied {{ application.appliedAt | date:'mediumDate' }}</p></div>
                <span class="h-fit rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{{ application.status }}</span>
              </div>
              <button class="mt-4 text-sm font-semibold text-blue-800 underline" (click)="showHistory(application.id)">View status history</button>
              @if (detail()?.application?.id === application.id) {
                @if (detail()?.resume; as resume) { <div class="mt-3"><app-resume-download [resume]="resume" [applicationId]="application.id" /></div> }
                <ol class="mt-4 space-y-3 border-l-2 border-blue-100 pl-4">
                  @for (event of detail()!.timeline; track event.id) {
                    <li class="text-sm"><strong>{{ event.toStatus }}</strong> <span class="text-slate-500">{{ event.createdAt | date:'medium' }}</span></li>
                  } @empty { <li class="text-sm text-slate-500">No historical events recorded for this older application.</li> }
                </ol>
              }
            </article>
          } @empty { @if (!error()) { <section class="card-surface p-10 text-center"><h2 class="text-lg font-bold">Your next opportunity starts here</h2><p class="mt-2 text-slate-500">You have not submitted an application yet.</p><a routerLink="/jobs" class="mt-5 inline-block rounded bg-blue-800 px-5 py-3 font-semibold text-white">Find a job</a></section> } }
        </div>
      }
      <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="load($event)" />
    </main>`,
})
export class MyApplicationsComponent implements OnInit {
  private readonly repo = inject(JOB_SEEKER_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  protected readonly linkedDetail=signal<ApplicationDetail | null>(null);
  protected readonly applications = signal<JobApplication[]>([]);
  protected readonly detail = signal<ApplicationDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly page = signal(0);
  protected readonly totalPages = signal(1);
  private version = 0;
  ngOnInit(): void {
    void this.load(0);
    const id=this.route.snapshot.queryParamMap.get('applicationId');
    if (id) void this.openLinked(id);
  }
  private async openLinked(id: string): Promise<void> {
    try { this.linkedDetail.set(await firstValueFrom(this.repo.application(id))); }
    catch { this.error.set('This application is unavailable or belongs to another account.'); }
  }
  protected async load(page: number): Promise<void> {
    const version = ++this.version;
    this.loading.set(true); this.error.set('');
    try {
      const result = await firstValueFrom(this.repo.applicationsPage(page));
      if (version === this.version) { this.applications.set(result.content); this.page.set(result.page); this.totalPages.set(result.totalPages); }
    } catch { if (version === this.version) this.error.set('Unable to load your applications.'); }
    finally { if (version === this.version) this.loading.set(false); }
  }
  protected async showHistory(id: string): Promise<void> {
    try { this.detail.set(await firstValueFrom(this.repo.application(id))); }
    catch { this.error.set('Unable to load this application history.'); }
  }
}
