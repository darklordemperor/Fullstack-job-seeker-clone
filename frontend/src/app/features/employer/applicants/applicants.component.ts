import { Component, computed, signal } from '@angular/core';
import { sampleApplications, sampleProfile } from '../../../data/sample-data';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';

@Component({
  selector: 'app-applicants',
  standalone: true,
  imports: [PaginationComponent],
  template: `
    <main class="shell py-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-[#174ea6]">Hiring workspace</p>
          <h1 class="mt-1 text-2xl font-bold">Applicants</h1>
          <p class="mt-2 text-sm text-slate-600">Review 20 mock job applications with eight records per page.</p>
        </div>
        <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold">Export list</button>
      </div>
      <section class="mt-7 grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside class="card-surface h-fit p-4">
          <p class="text-sm font-bold">Pipeline</p>
          @for (item of pipeline; track item.label) {
            <button type="button" class="mt-3 flex w-full justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-blue-50">
              <span>{{ item.label }}</span><span class="font-bold">{{ item.value }}</span>
            </button>
          }
        </aside>
        <div>
          <div class="grid gap-4">
            @for (applicant of pagedApplicants(); track applicant.id) {
              <article class="card-surface p-5">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 class="font-bold">{{ applicant.applicantName }}</h2>
                    <p class="mt-1 text-sm text-slate-600">{{ applicant.jobTitle }}</p>
                    <p class="mt-3 text-xs text-slate-500">{{ applicant.applicantEmail }} · Applied recently</p>
                  </div>
                  <span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-[#174ea6]">{{ applicant.status }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  @for (skill of ['Angular', 'Communication', 'REST APIs']; track skill) {
                    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{{ skill }}</span>
                  }
                </div>
                <div class="mt-5 flex gap-2">
                  <button type="button" class="rounded-md bg-[#174ea6] px-4 py-2 text-xs font-bold text-white" (click)="selected.set(applicant.id)">Review profile</button>
                  <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-xs font-bold">Move stage</button>
                </div>
              </article>
            }
          </div>
          <div class="mt-5">
            <app-pagination [page]="page()" [totalPages]="totalPages" (pageChange)="page.set($event)" />
          </div>
        </div>
      </section>
    </main>
    @if (selectedApplicant(); as applicant) {
      <div class="fixed inset-0 z-40 bg-slate-950/45" (click)="selected.set(null)"></div>
      <aside class="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-[#174ea6]">Applicant profile</p>
            <h2 class="mt-1 text-xl font-bold">{{ applicant.applicantName }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ applicant.applicantEmail }}</p>
          </div>
          <button type="button" class="text-xl text-slate-500" (click)="selected.set(null)">×</button>
        </div>
        <section class="mt-7 rounded-lg bg-blue-50 p-4">
          <p class="text-xs font-bold uppercase tracking-wide text-[#174ea6]">Applied for</p>
          <h3 class="mt-2 font-bold">{{ applicant.jobTitle }}</h3>
          <p class="mt-2 text-sm text-slate-600">Current stage: {{ applicant.status }}</p>
        </section>
        <section class="mt-7">
          <h3 class="font-bold">Profile summary</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ profile.summary }}</p>
        </section>
        <section class="mt-7">
          <h3 class="font-bold">Skills</h3>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (skill of profile.skills; track skill.name) {
              <span class="rounded-full bg-slate-100 px-3 py-2 text-xs">{{ skill.name }}</span>
            }
          </div>
        </section>
        <section class="mt-7">
          <h3 class="font-bold">Education</h3>
          @for (education of profile.educations; track education.institution) {
            <article class="mt-3 rounded-lg border p-4 text-sm">
              <p class="font-bold">{{ education.degree }}</p>
              <p class="mt-1 text-slate-600">{{ education.institution }} · {{ education.graduationYear }}</p>
            </article>
          }
        </section>
        <div class="mt-8 flex gap-3 border-t pt-5">
          <button type="button" class="rounded bg-[#174ea6] px-4 py-2 text-sm font-bold text-white">Move to review</button>
          <button type="button" class="rounded border px-4 py-2 text-sm font-bold">Download resume</button>
        </div>
      </aside>
    }
  `,
})
export class ApplicantsComponent {
  protected readonly page = signal(0);
  protected readonly selected = signal<string | null>(null);
  protected readonly profile = sampleProfile;
  protected readonly totalPages = Math.ceil(sampleApplications.length / 8);
  protected readonly pagedApplicants = computed(() => sampleApplications.slice(this.page() * 8, this.page() * 8 + 8));
  protected readonly selectedApplicant = computed(() => sampleApplications.find((applicant) => applicant.id === this.selected()) ?? null);
  protected readonly pipeline = [
    { label: 'All applicants', value: 20 },
    { label: 'Submitted', value: 14 },
    { label: 'Reviewing', value: 4 },
    { label: 'Hired', value: 2 },
  ];
}
