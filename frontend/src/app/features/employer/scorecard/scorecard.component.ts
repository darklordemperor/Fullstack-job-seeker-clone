import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ScorecardStore } from './scorecard.store';
import { Scorecard } from '../../../domain/scorecard.model';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { DialogFocusDirective } from '../../../shared/ui/modal/dialog-focus.directive';

@Component({
  selector: 'app-scorecard', standalone: true, providers: [ScorecardStore],
  imports: [DatePipe, FormsModule, RouterLink, PaginationComponent, DialogFocusDirective],
  template: `
    <main class="shell max-w-6xl py-8">
      <a routerLink="/employer/interviews" class="text-sm font-semibold text-blue-800">← Interviews</a>
      <header class="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-widest text-blue-700">Private hiring feedback</p><h1 class="mt-2 text-3xl font-bold">Interview scorecard</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Capture job-relevant evidence and a consistent recommendation. This feedback is visible only to your employer account.</p></div>
        <span class="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-900">{{ store.scorecard()?.status === 'FINALIZED' ? 'Finalized · read-only' : 'Private draft' }}</span>
      </header>
      @if (store.loading()) { <p role="status" class="card-surface mt-6 p-8">Loading scorecard…</p> }
      @else if (store.error()) { <div role="alert" class="card-surface mt-6 p-6 text-red-800">{{ store.error() }} <button class="ml-3 underline" (click)="reload($event)">Retry</button></div> }
      @else if (store.interview(); as interview) {
        <section class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-5">
          <div class="min-w-0"><h2 class="break-words text-lg font-bold">{{ interview.candidateName }}</h2><p class="mt-1 break-words text-sm text-slate-600">{{ interview.jobTitle }} · Round {{ interview.round }}</p></div>
          <div class="flex flex-wrap items-center gap-3"><span class="rounded-full bg-white px-3 py-2 text-xs font-semibold">{{ interview.status }}</span>
          <button type="button" class="min-h-11 rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" [disabled]="store.saving()" (click)="reload($event)">Reload saved version</button></div>
        </section>
        @if (store.notice()) { <p role="status" class="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{{ store.notice() }}</p> }
        @if (store.actionError()) { <p role="alert" class="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">{{ store.actionError() }} Your form is preserved; reload to resolve a stale version.</p> }
        <div class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <form class="card-surface min-w-0 p-5 sm:p-6" (ngSubmit)="store.save()">
            <h2 class="text-lg font-bold">Evaluation</h2><p class="mt-2 text-sm leading-6 text-slate-500">Rate observed evidence: 1 below expectations, 3 meets expectations, 5 exceeds expectations. Leave unassessed criteria blank in a draft.</p>
            <fieldset class="mt-5 min-w-0 space-y-5" [disabled]="readOnly() || store.saving()">
              <legend class="sr-only">Interview feedback</legend>
              <div class="grid gap-4 sm:grid-cols-3">
                @for (criterion of criteria; track criterion.key) {
                  <label class="grid min-w-0 gap-2 text-sm font-semibold">{{ criterion.label }}
                    <select [name]="criterion.key" class="min-h-11 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" [ngModel]="store.form()[criterion.key]" (ngModelChange)="rate(criterion.key, $event)">
                      <option [ngValue]="null">Not rated</option>@for (rating of ratings; track rating) { <option [ngValue]="rating">{{ rating }} / 5</option> }
                    </select>
                  </label>
                }
              </div>
              <label class="grid gap-2 text-sm font-semibold">Strengths<textarea name="strengths" rows="4" maxlength="2000" class="w-full min-w-0 rounded-lg border border-slate-300 p-3 font-normal" placeholder="Specific examples of relevant skills and effective decisions" [ngModel]="store.form().strengths" (ngModelChange)="store.edit({ strengths: $event })"></textarea><span class="text-right text-xs font-normal text-slate-500">{{ store.form().strengths.length }} / 2000</span></label>
              <label class="grid gap-2 text-sm font-semibold">Concerns<textarea name="concerns" rows="4" maxlength="2000" class="w-full min-w-0 rounded-lg border border-slate-300 p-3 font-normal" placeholder="Job-related gaps and areas to explore further" [ngModel]="store.form().concerns" (ngModelChange)="store.edit({ concerns: $event })"></textarea><span class="text-right text-xs font-normal text-slate-500">{{ store.form().concerns.length }} / 2000</span></label>
              <label class="grid gap-2 text-sm font-semibold">Overall recommendation<select name="recommendation" class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2" [ngModel]="store.form().recommendation" (ngModelChange)="store.edit({ recommendation: $event })"><option [ngValue]="null">Not decided</option><option value="STRONG_HIRE">Strong hire</option><option value="HIRE">Hire</option><option value="HOLD">Hold for more evidence</option><option value="NO_HIRE">No hire</option></select></label>
            </fieldset>
            @if (readOnly()) { <p class="mt-5 rounded-lg bg-slate-100 p-4 text-sm text-slate-600">{{ store.scorecard()?.status === 'FINALIZED' ? 'This finalized scorecard cannot be changed.' : 'This interview closed without completion. Existing feedback is read-only.' }}</p> }
            @else {
              <div class="mt-6 flex flex-wrap items-center gap-3 border-t pt-5"><button type="submit" class="min-h-11 rounded-lg bg-blue-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" [disabled]="store.saving()">{{ store.saving() ? 'Saving…' : 'Save draft' }}</button>
                <button type="button" class="min-h-11 rounded-lg border border-blue-800 px-5 py-3 text-sm font-bold text-blue-800 disabled:opacity-50" [disabled]="store.saving() || interview.status !== 'COMPLETED'" (click)="requestFinalize($event)">Review & finalize</button>
                <span class="text-xs text-slate-500">{{ store.dirty() ? 'Unsaved changes' : store.scorecard() ? 'Saved version ' + store.scorecard()!.version : 'Not saved yet' }}</span>
              </div>
              @if (interview.status !== 'COMPLETED') { <p class="mt-3 text-xs leading-5 text-slate-500">Mark the interview completed from Interviews before finalizing. Saving feedback never changes the candidate's application status.</p> }
            }
          </form>
          <aside class="card-surface min-w-0 p-5 sm:p-6" aria-label="Scorecard revision history">
            <h2 class="text-lg font-bold">Revision history</h2><p class="mt-2 text-sm leading-6 text-slate-500">Each saved version remains available. Unsaved edits are not recorded.</p>
            @if (store.historyLoading()) { <p role="status" class="mt-5 text-sm">Loading revisions…</p> }
            @else if (store.historyError()) { <p role="alert" class="mt-5 text-sm text-red-700">{{ store.historyError() }} <button class="underline" (click)="store.history(store.historyPage())">Retry history</button></p> }
            @else {
              <ol class="mt-5 space-y-3">@for (item of store.revisions(); track item.version) {
                <li><button type="button" class="w-full rounded-lg border border-slate-200 p-4 text-left hover:border-blue-400" [attr.aria-label]="'View scorecard revision ' + item.version" (click)="openRevision(item, $event)"><span class="flex flex-wrap justify-between gap-2 text-sm font-bold"><span>Version {{ item.version }}</span><span class="text-xs text-blue-800">{{ item.status }}</span></span><span class="mt-2 block text-xs text-slate-500">{{ item.updatedAt | date:'medium' }}</span></button></li>
              } @empty { <li class="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">No saved feedback yet. Save a draft to start the record.</li> }</ol>
              <app-pagination [page]="store.historyPage()" [totalPages]="store.historyPages()" (pageChange)="store.history($event)" />
            }
            <p class="mt-6 border-t pt-4 text-xs leading-5 text-slate-500">Private to the job owner. Recommendations do not automatically hire, reject or notify candidates.</p>
          </aside>
        </div>
      }
      @if (confirmation(); as action) {
        <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4"><section appDialogFocus aria-label="Confirm scorecard action" (dismissed)="closeConfirmation()" class="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
          <h2 class="text-xl font-bold">{{ action === 'finalize' ? 'Finalize this scorecard?' : 'Discard unsaved changes?' }}</h2><p class="mt-3 text-sm leading-6 text-slate-600">{{ action === 'finalize' ? 'Your current feedback will be saved as a read-only final version. This does not change the application status or notify the candidate.' : 'Reloading replaces this form with the latest saved version. Unsaved changes will be lost.' }}</p>
          <div class="mt-6 flex flex-wrap gap-3"><button type="button" class="min-h-11 rounded-lg border px-4 py-2" [disabled]="store.saving()" (click)="closeConfirmation()">Keep editing</button><button type="button" class="min-h-11 rounded-lg bg-blue-800 px-4 py-2 font-bold text-white disabled:opacity-50" [disabled]="store.saving()" (click)="confirm()">{{ action === 'finalize' ? 'Finalize scorecard' : 'Discard & reload' }}</button></div>
        </section></div>
      }
      @if (revision(); as item) {
        <div class="fixed inset-0 z-50 bg-slate-950/50"></div><aside appDialogFocus aria-label="Saved scorecard revision" (dismissed)="revision.set(null)" class="fixed right-0 top-0 z-50 h-dvh w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl sm:p-6">
          <div class="flex items-start justify-between gap-3"><h2 class="text-xl font-bold">Version {{ item.version }} · {{ item.status }}</h2><button type="button" aria-label="Close revision" class="min-h-11 min-w-11 rounded border" (click)="revision.set(null)">×</button></div>
          <p class="mt-3 text-sm text-slate-500">{{ item.updatedAt | date:'medium' }}</p><dl class="mt-6 space-y-4">@for (criterion of criteria; track criterion.key) { <div class="flex flex-wrap justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><dt>{{ criterion.label }}</dt><dd class="font-bold">{{ item.feedback[criterion.key] ?? 'Not rated' }}</dd></div> }
            <div><dt class="font-bold">Strengths</dt><dd class="mt-2 whitespace-pre-line break-words text-sm leading-6">{{ item.feedback.strengths || 'No notes' }}</dd></div><div><dt class="font-bold">Concerns</dt><dd class="mt-2 whitespace-pre-line break-words text-sm leading-6">{{ item.feedback.concerns || 'No notes' }}</dd></div><div><dt class="font-bold">Recommendation</dt><dd class="mt-2 text-sm">{{ item.feedback.recommendation || 'Not decided' }}</dd></div>
          </dl>
        </aside>
      }
    </main>
  `,
})
export class ScorecardComponent implements OnInit {
  protected readonly store = inject(ScorecardStore);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  protected readonly ratings = [1, 2, 3, 4, 5];
  protected readonly criteria = [{ key: 'technicalSkills', label: 'Technical skills' }, { key: 'communication', label: 'Communication' }, { key: 'problemSolving', label: 'Problem-solving' }] as const;
  protected readonly readOnly = computed(() => this.store.scorecard()?.status === 'FINALIZED' || !['PROPOSED', 'CONFIRMED', 'COMPLETED'].includes(this.store.interview()?.status ?? ''));
  protected readonly confirmation = signal<'reload' | 'finalize' | null>(null);
  protected readonly revision = signal<Scorecard | null>(null);
  ngOnInit() { void this.store.load(this.id); }
  protected rate(key: 'technicalSkills' | 'communication' | 'problemSolving', value: number | null) { this.store.edit({ [key]: value }); }
  protected openRevision(item: Scorecard, event: Event) { (event.currentTarget as HTMLElement).focus(); this.revision.set(item); }
  protected reload(event?: Event) { if (this.store.dirty()) { (event?.currentTarget as HTMLElement | undefined)?.focus(); this.confirmation.set('reload'); } else void this.store.load(this.id); }
  protected requestFinalize(event?: Event) { if (this.store.prepareFinalization()) { (event?.currentTarget as HTMLElement | undefined)?.focus(); this.confirmation.set('finalize'); } }
  protected closeConfirmation() { if (!this.store.saving()) this.confirmation.set(null); }
  protected async confirm() {
    if (this.confirmation() === 'reload') { this.confirmation.set(null); await this.store.load(this.id); }
    else { this.confirmation.set(null); await this.store.save(true); }
  }
}
