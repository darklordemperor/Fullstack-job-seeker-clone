import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { Interview, InterviewProposal, InterviewViewer, InterviewAction } from '../../domain/interview.model';
import { localDateTime, toUtc } from '../../domain/interview.rules';
import { PaginationComponent } from '../../shared/ui/pagination/pagination.component';
import { DialogFocusDirective } from '../../shared/ui/modal/dialog-focus.directive';
import { InterviewsStore } from './interviews.store';

@Component({
  selector: 'app-interviews', standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, PaginationComponent, DialogFocusDirective], providers: [InterviewsStore],
  styles: [`a { color: #174ea6; } input, select, textarea { min-width: 0; width: 100%; }`],
  template: `
    <main class="shell max-w-5xl py-8 sm:py-12">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-wider text-blue-800">The next conversation</p>
          <h1 class="mt-2 text-3xl font-bold">Interviews</h1>
          <p class="mt-3 max-w-xl text-sm leading-6 text-slate-600">{{ isEmployer ? 'Propose times, manage responses and keep your hiring conversations organized.' : 'Choose an interview time and keep track of your upcoming conversations.' }}</p>
        </div>
        @if (isEmployer) { <a routerLink="/employer/manage-jobs" class="rounded-lg border px-4 py-3 text-sm font-bold">Choose an applicant</a> }
      </header>
      <p class="mt-4 text-xs text-slate-500">Times shown in {{ timezone }}. Calendar downloads are snapshots; check this page for changes.</p>
      <div class="my-6 flex flex-wrap items-center gap-3">
        <button type="button" [disabled]="store.busy()" [attr.aria-pressed]="store.upcoming()" class="rounded-lg border px-4 py-3 text-sm font-semibold" [class.bg-blue-50]="store.upcoming()" (click)="store.load(viewer,0,true)">Upcoming</button>
        <button type="button" [disabled]="store.busy()" [attr.aria-pressed]="!store.upcoming()" class="rounded-lg border px-4 py-3 text-sm font-semibold" [class.bg-blue-50]="!store.upcoming()" (click)="store.load(viewer,0,false)">All interviews</button>
        <button type="button" [disabled]="store.busy()" class="ml-auto rounded-lg px-4 py-3 text-sm font-semibold text-blue-800" (click)="reload()">Refresh</button>
      </div>
      @if (store.notice()) { <p role="status" class="mb-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{{ store.notice() }}</p> }
      @if (store.actionError() && !editorOpen()) { <p role="alert" class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{{ store.actionError() }}</p> }
      @if (store.loading()) { <p role="status" class="card-surface p-10 text-center">Loading interviews…</p> }
      @else if (store.error()) {
        <section role="alert" class="card-surface p-8 text-center"><p class="text-red-800">{{ store.error() }}</p><button class="mt-4 rounded border px-5 py-3" (click)="reload()">Retry</button></section>
      } @else {
        <section class="grid gap-5">
          @for (item of store.items(); track item.id) {
            <article class="card-surface min-w-0 p-5 sm:p-6">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 break-words"><h2 class="text-xl font-bold">{{ item.jobTitle }}</h2><p class="mt-1 text-sm text-slate-600">{{ isEmployer ? item.candidateName : item.companyName }}</p></div>
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{{ item.status }}</span><span class="text-xs font-semibold text-slate-600">Round {{ item.round }}</span>
              </div>
              <p class="mt-4 text-sm font-semibold">{{ item.mode === 'ONLINE' ? 'Online interview' : 'In-person interview' }}</p>
              @if (item.mode === 'ONLINE') { <a [href]="item.location" target="_blank" rel="noopener noreferrer" class="mt-1 block break-all text-sm underline">{{ item.location }}</a> }
              @else { <p class="mt-1 whitespace-pre-line break-words text-sm text-slate-600">{{ item.location }}</p> }
              <p class="mt-2 text-xs text-slate-500">Organizer timezone: {{ item.timezone }}</p>
              <div class="mt-5 grid gap-3">
                @for (slot of item.slots; track slot.id) {
                  @if (!item.selectedSlotId || item.selectedSlotId === slot.id) {
                    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div class="min-w-0"><p class="text-sm font-semibold">{{ slot.startsAt | date:'medium' }}</p><p class="mt-1 text-xs text-slate-600">Until {{ slot.endsAt | date:'medium' }}</p></div>
                      @if (!isEmployer && item.status === 'PROPOSED') {
                        <button type="button" class="rounded-lg bg-blue-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50" [disabled]="store.busy() || expired(slot.startsAt)" (click)="store.decide(viewer,item,'accept',slot.id)">{{ expired(slot.startsAt) ? 'Expired' : 'Accept this time' }}</button>
                      }
                    </div>
                  }
                }
              </div>
              @if (isEmployer && item.status === 'CONFIRMED') { <p class="mt-4 text-xs text-slate-600">Record the outcome after the scheduled end time. Past meetings are available under All interviews.</p> }
              <div class="mt-5 flex flex-wrap gap-3">
                @if (isEmployer) { <a [routerLink]="['/employer/interviews', item.id, 'scorecard']" class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold">Scorecard</a> }
                <button type="button" class="rounded-lg border px-4 py-3 text-sm font-semibold" (click)="openHistory(item,$event)">View history</button>
                @if (isEmployer && item.status === 'CONFIRMED' && ended(item)) {
                  <button type="button" class="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white" [disabled]="store.busy()" (click)="confirmAction.set({ item, action: 'complete' })">Mark completed</button>
                  <button type="button" class="rounded-lg border px-4 py-3 text-sm font-semibold" [disabled]="store.busy()" (click)="confirmAction.set({ item, action: 'no-show' })">Mark no-show</button>
                }
                @if (isEmployer && item.status !== 'PROPOSED' && item.status !== 'CONFIRMED') {
                  <button type="button" class="rounded-lg border px-4 py-3 text-sm font-bold text-blue-800" [disabled]="store.busy()" (click)="nextRound(item)">Schedule next round</button>
                }
                @if (item.status === 'CONFIRMED') { <button type="button" class="rounded-lg border px-4 py-3 text-sm font-bold text-blue-800" [disabled]="store.busy()" (click)="download(item)">Download calendar</button> }
                @if (item.status === 'PROPOSED' || item.status === 'CONFIRMED') {
                  @if (isEmployer) { <button type="button" class="rounded-lg border px-4 py-3 text-sm font-bold text-blue-800" [disabled]="store.busy()" (click)="reschedule(item)">Reschedule</button> }
                  @if (!isEmployer && item.status === 'PROPOSED') { <button type="button" class="rounded-lg border px-4 py-3 text-sm font-semibold" [disabled]="store.busy()" (click)="confirmAction.set({ item, action: 'decline' })">Decline invitation</button> }
                  @else { <button type="button" class="rounded-lg px-4 py-3 text-sm font-semibold text-red-700" [disabled]="store.busy()" (click)="confirmAction.set({ item, action: 'cancel' })">Cancel interview</button> }
                }
              </div>
            </article>
          } @empty {
            <div class="card-surface p-10 text-center"><div aria-hidden="true" class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-2xl">◷</div>
              <h2 class="text-xl font-bold">{{ store.upcoming() ? 'No upcoming interviews' : 'No interviews yet' }}</h2>
              <p class="mt-3 text-sm text-slate-600">{{ isEmployer ? 'Open an applicant from Manage jobs to propose interview times.' : 'Interview invitations from employers will appear here.' }}</p>
            </div>
          }
        </section>
        @if (!store.busy()) { <div class="mt-6"><app-pagination [page]="store.page()" [totalPages]="store.totalPages()" (pageChange)="store.load(viewer,$event)" /></div> }
      }
    </main>
    @if (store.historyItem(); as item) {
      <div class="fixed inset-0 z-50 bg-slate-950/45"></div>
      <aside appDialogFocus aria-label="Interview history" (dismissed)="store.closeHistory()" class="fixed right-0 top-0 z-50 h-dvh w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl sm:p-6">
        <header class="flex items-start justify-between gap-3"><div><h2 class="text-xl font-bold">Interview history</h2><p class="mt-2 text-sm">{{ item.jobTitle }} · Round {{ item.round }}</p></div><button type="button" aria-label="Close history" class="min-h-11 min-w-11" (click)="store.closeHistory()">×</button></header>
        <p class="mt-3 text-xs leading-5 text-slate-500">Times shown in {{ timezone }}. Outcomes are recorded by the employer. A baseline is the earliest retained state; earlier changes are unavailable.</p>
        @if (store.historyLoading()) { <p role="status" class="py-8">Loading history…</p> }
        @else if (store.historyError()) { <div role="alert" class="mt-5 rounded bg-red-50 p-4"><p>{{ store.historyError() }}</p><button class="mt-3 rounded border px-4 py-3" (click)="store.history(viewer,item,store.historyPage())">Retry history</button></div> }
        @else {
          <ol class="mt-6 space-y-4">
            @for (revision of store.revisions(); track revision.version) {
              <li class="rounded-lg border p-4"><p class="font-bold">{{ revision.event }} <span class="text-xs font-normal">· Version {{ revision.version }}</span></p><p class="mt-1 text-xs text-slate-500">{{ revision.occurredAt | date:'medium' }}</p>
                <p class="mt-3 break-all text-sm">{{ revision.snapshot.location }}</p><p class="mt-1 text-xs">Organizer timezone: {{ revision.snapshot.timezone }}</p>
                @for (slot of revision.snapshot.slots; track slot.id) { <p class="mt-2 text-sm">{{ slot.startsAt | date:'medium' }} – {{ slot.endsAt | date:'shortTime' }} @if (slot.id === revision.snapshot.selectedSlotId) { <strong>(Selected)</strong> }</p> }
              </li>
            } @empty { <li class="py-8 text-sm">No revisions available.</li> }
          </ol>
          <div class="mt-6"><app-pagination [page]="store.historyPage()" [totalPages]="store.historyPages()" (pageChange)="store.history(viewer,item,$event)" /></div>
        }
      </aside>
    }
    @if (editorOpen()) {
      <div class="fixed inset-0 z-50 bg-slate-950/45"></div>
      <aside appDialogFocus aria-label="Interview invitation" (dismissed)="closeEditor()" class="fixed right-0 top-0 z-50 h-dvh w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl sm:p-6">
        <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase text-blue-800">Interview invitation</p><h2 class="mt-2 text-xl font-bold">{{ editing() ? 'Propose new times' : 'Schedule an interview' }}</h2></div><button type="button" aria-label="Close invitation" class="min-h-11 min-w-11" [disabled]="store.busy()" (click)="closeEditor()">×</button></div>
        <p class="mt-3 text-sm text-slate-600">{{ editing()?.candidateName || roundSource()?.candidateName || store.applicant()?.name }} · {{ editing()?.jobTitle || roundSource()?.jobTitle || store.applicant()?.job }}</p>
        <p class="mt-3 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900">Offer up to three slots in {{ timezone }}. Times are only reserved after acceptance. Rescheduling releases the previous booking and asks the candidate to confirm again.</p>
        <form class="mt-5" (ngSubmit)="submit()">
          <fieldset class="min-w-0 space-y-4" [disabled]="store.busy()">
            <label class="grid gap-1 text-sm font-semibold">Interview format<select name="mode" class="rounded border p-3" [ngModel]="mode()" (ngModelChange)="mode.set($event)"><option value="ONLINE">Online</option><option value="IN_PERSON">In person</option></select></label>
            <label class="grid gap-1 text-sm font-semibold">{{ mode() === 'ONLINE' ? 'HTTPS meeting link' : 'Location and room' }}<input name="location" required maxlength="1000" class="rounded border p-3" [ngModel]="location()" (ngModelChange)="location.set($event)"></label>
            @for (slot of slots(); track $index; let i = $index) {
              <fieldset class="min-w-0 rounded-lg border p-4"><legend class="px-2 text-sm font-bold">Option {{ i + 1 }}</legend>
                <label class="grid gap-1 text-sm font-semibold">Start time {{ i + 1 }}<input type="datetime-local" [name]="'start'+i" required class="rounded border p-3" [ngModel]="slot.start" (ngModelChange)="patchSlot(i,'start',$event)"></label>
                <label class="mt-3 grid gap-1 text-sm font-semibold">End time {{ i + 1 }}<input type="datetime-local" [name]="'end'+i" required class="rounded border p-3" [ngModel]="slot.end" (ngModelChange)="patchSlot(i,'end',$event)"></label>
                <p class="mt-2 break-all text-xs text-slate-500">UTC start: {{ utcPreview(slot.start) }}</p>
                @if (slots().length > 1) { <button type="button" class="mt-3 min-h-11 text-sm font-semibold text-red-700" [attr.aria-label]="'Remove option '+(i+1)" (click)="removeSlot(i)">Remove option</button> }
              </fieldset>
            }
            @if (slots().length < 3) { <button type="button" class="min-h-11 rounded border px-4 text-sm font-semibold text-blue-800" (click)="addSlot()">Add another time</button> }
          </fieldset>
          @if (formError() || store.actionError()) { <p role="alert" class="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{{ formError() || store.actionError() }}</p> }
          <div class="mt-6 flex gap-3 border-t pt-5"><button type="submit" class="rounded-lg bg-blue-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" [disabled]="store.busy()">{{ store.busy() ? 'Saving…' : 'Send invitation' }}</button><button type="button" class="rounded px-4 py-3 text-sm font-semibold" [disabled]="store.busy()" (click)="closeEditor()">Cancel</button></div>
        </form>
      </aside>
    }
    @if (confirmAction(); as pending) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><section appDialogFocus aria-label="Confirm interview action" (dismissed)="confirmAction.set(null)" class="w-full max-w-md rounded-xl bg-white p-6">
        <h2 class="text-xl font-bold">{{ actionTitle(pending.action) }}</h2><p class="mt-3 text-sm text-slate-600">Both participants will see this outcome in the history. This closes the round; a new invitation is needed to book again.</p>
        <div class="mt-5 flex flex-wrap gap-3"><button class="rounded bg-red-700 px-4 py-3 font-semibold text-white" (click)="confirm()">Confirm</button><button class="rounded border px-4 py-3" (click)="confirmAction.set(null)">Keep interview</button></div>
      </section></div>
    }
  `,
})
export class InterviewsComponent implements OnInit {
  protected readonly store = inject(InterviewsStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly isEmployer = inject(AuthStore).isEmployer();
  protected readonly viewer: InterviewViewer = this.isEmployer ? 'employer' : 'job-seeker';
  protected readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  protected readonly editorOpen = signal(false);
  protected readonly roundSource = signal<Interview | undefined>(undefined);
  protected readonly editing = signal<Interview | undefined>(undefined);
  protected readonly mode = signal<InterviewProposal['mode']>('ONLINE');
  protected readonly location = signal('');
  protected readonly slots = signal([{ start: '', end: '' }]);
  protected readonly formError = signal('');
  protected readonly confirmAction = signal<{ item: Interview; action: InterviewAction } | null>(null);
  async ngOnInit(): Promise<void> {
    const interviewId = this.route.snapshot.queryParamMap.get('interviewId');
    if (interviewId) void this.store.open(this.viewer,interviewId);
    else void this.store.load(this.viewer);
    const applicationId = this.route.snapshot.queryParamMap.get('applicationId');
    if (this.isEmployer && applicationId && await this.store.loadApplicant(applicationId)) this.editorOpen.set(true);
  }
  protected openHistory(item: Interview, event: Event): void {
    // WebKit may leave focus on the old control after a pointer click.
    (event.currentTarget as HTMLElement).focus();
    void this.store.history(this.viewer,item);
  }
  protected reload(): void {
    const id=this.store.focusedId();
    if (id) void this.store.open(this.viewer,id); else void this.store.load(this.viewer,this.store.page());
  }
  protected ended(item: Interview): boolean { return item.slots.some(slot => slot.id === item.selectedSlotId && Date.parse(slot.endsAt) <= Date.now()); }
  protected actionTitle(action: InterviewAction): string {
    return ({ accept: 'Accept this time?', decline: 'Decline this invitation?', cancel: 'Cancel this interview?', complete: 'Mark this interview completed?', 'no-show': 'Record a no-show?' })[action];
  }
  protected nextRound(item: Interview): void {
    this.editing.set(undefined); this.roundSource.set(item); this.mode.set(item.mode); this.location.set(item.location);
    this.slots.set([{ start: '', end: '' }]); this.formError.set(''); this.store.clearAction(); this.editorOpen.set(true);
  }
  protected expired(start: string): boolean { return Date.parse(start) <= Date.now(); }
  protected utcPreview(value: string): string { try { return toUtc(value); } catch { return 'Choose a valid local time'; } }
  protected patchSlot(index: number, field: 'start' | 'end', value: string): void { this.slots.update(slots => slots.map((slot,i) => i === index ? { ...slot, [field]: value } : slot)); }
  protected addSlot(): void { this.slots.update(slots => [...slots, { start: '', end: '' }]); }
  protected removeSlot(index: number): void { this.slots.update(slots => slots.filter((_,i) => i !== index)); }
  protected closeEditor(): void { if (!this.store.busy()) this.editorOpen.set(false); }
  protected reschedule(item: Interview): void {
    this.roundSource.set(undefined); this.editing.set(item); this.mode.set(item.mode); this.location.set(item.location); this.formError.set(''); this.store.clearAction();
    this.slots.set(item.slots.map(slot => ({ start: localDateTime(slot.startsAt), end: localDateTime(slot.endsAt) }))); this.editorOpen.set(true);
  }
  protected async submit(): Promise<void> {
    if (this.store.busy()) return;
    this.formError.set('');
    try {
      const proposal: InterviewProposal = { mode: this.mode(), location: this.location(), timezone: this.timezone,
        slots: this.slots().map(slot => ({ startsAt: toUtc(slot.start), endsAt: toUtc(slot.end) })) };
      const id = this.editing()?.applicationId || this.roundSource()?.applicationId || this.store.applicant()?.id;
      if (id && await this.store.schedule(id,proposal,this.editing())) this.closeEditor();
    } catch (error) { this.formError.set(error instanceof Error ? error.message : 'Check the proposed times.'); }
  }
  protected confirm(): void {
    const pending = this.confirmAction(); this.confirmAction.set(null);
    if (pending) void this.store.decide(this.viewer,pending.item,pending.action);
  }
  protected async download(item: Interview): Promise<void> {
    const file = await this.store.calendar(this.viewer,item.id);
    if (!file) return;
    const url = URL.createObjectURL(new Blob([file.content], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href=url; link.download=file.filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
}
