import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResumesStore } from './resumes.store';
import { ResumeVersion } from '../../../domain/resume.model';
import { ResumeDownloadComponent } from '../../../shared/ui/resume-download.component';
import { DialogFocusDirective } from '../../../shared/ui/modal/dialog-focus.directive';

@Component({
  selector: 'app-resumes', standalone: true, providers: [ResumesStore],
  imports: [DatePipe, DecimalPipe, RouterLink, ResumeDownloadComponent, DialogFocusDirective],
  template: `
    <main class="shell max-w-5xl py-8">
      <a routerLink="/job-seeker/profile" class="text-sm font-semibold text-blue-800">← Your profile</a>
      <div class="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-widest text-blue-700">Application documents</p>
          <h1 class="mt-2 text-3xl font-bold">Your résumés</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Keep your next application ready. Each submission preserves the selected PDF, even when you upload a newer version.</p></div>
        <span class="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold">{{ store.items().length }} / 10 versions</span>
      </div>
      @if (store.error()) { <p role="alert" class="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{{ store.error() }} <button class="underline" (click)="store.load()">Retry</button></p> }
      @if (store.actionError()) { <p role="alert" class="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{{ store.actionError() }}</p> }
      @if (store.notice()) { <p role="status" class="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-900">{{ store.notice() }}</p> }
      <div class="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section class="card-surface min-w-0 p-6">
          <h2 class="text-lg font-bold">Upload a new version</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">PDF only, up to 5 MB. Uploading selects this version for future applications.</p>
          <label class="mt-5 block rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 text-sm font-semibold">
            Choose PDF
            <input #fileInput type="file" accept=".pdf,application/pdf" class="mt-3 block w-full min-w-0 text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:font-semibold file:text-blue-900" [disabled]="disabled() || store.items().length >= 10" (change)="choose($event)">
          </label>
          @if (selected(); as file) { <p class="mt-3 break-all text-sm text-slate-600">{{ file.name }} · {{ file.size / 1024 | number:'1.1-1' }} KB</p> }
          <button type="button" class="mt-5 min-h-11 w-full rounded-lg bg-blue-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" [disabled]="disabled() || !selected() || store.items().length >= 10" (click)="upload()">{{ store.busy() === 'upload' ? 'Uploading…' : 'Upload & use for applications' }}</button>
          <div class="mt-6 border-t pt-5 text-xs leading-5 text-slate-600"><strong class="text-slate-800">Private by default.</strong> Only you and the employer receiving an application can download its PDF. Your existing external résumé link remains supported.</div>
          <p class="mt-3 text-xs leading-5 text-slate-500">Submitted PDFs are retained with their applications. You can delete unused versions. Files are checked for PDF signatures; malware scanning is not included.</p>
        </section>
        <section class="min-w-0" aria-label="Résumé history" [attr.aria-busy]="store.loading()">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 class="text-lg font-bold">Version history</h2>
            @if (current()) { <button class="min-h-11 text-sm font-semibold text-blue-800 underline disabled:opacity-50" [disabled]="disabled()" (click)="store.clear()">Stop attaching PDF</button> }
          </div>
          @if (store.loading()) { <p role="status" class="card-surface p-6">Loading résumés…</p> }
          @else {
            <div class="space-y-4">
              @for (item of store.items(); track item.id) {
                <article class="card-surface min-w-0 p-5" [class.border-blue-500]="item.current">
                  <div class="flex flex-wrap gap-2">@if (item.current) { <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">Selected for applications</span> }
                    @if (item.attached) { <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Retained with application</span> }</div>
                  <h3 class="mt-3 break-all font-bold">{{ item.fileName }}</h3>
                  <p class="mt-2 text-xs text-slate-500">{{ item.createdAt | date:'medium' }} · {{ item.sizeBytes / 1024 | number:'1.1-1' }} KB</p>
                  <div class="mt-4 flex min-w-0 flex-wrap items-center gap-3"><app-resume-download class="min-w-0 max-w-full" [resume]="item" />
                    @if (!item.current) { <button class="min-h-11 text-sm font-semibold text-blue-800 underline disabled:opacity-50" [disabled]="disabled()" (click)="store.select(item)">Use this version</button> }
                    @if (!item.attached) { <button class="min-h-11 text-sm font-semibold text-red-700 underline disabled:opacity-50" [disabled]="disabled()" (click)="deleting.set(item)">Delete</button> }
                  </div>
                </article>
              } @empty { @if (!store.error()) { <div class="card-surface p-8"><h3 class="font-bold">Your next application starts here</h3><p class="mt-3 text-sm leading-6 text-slate-600">Upload a PDF to keep a private, permanent copy with each new application.</p></div> } }
            </div>
          }
          @if (!current() && store.items().length) { <p class="mt-4 text-sm text-slate-600">No PDF selected for future applications. Choose a version above to attach it.</p> }
        </section>
      </div>
      @if (deleting(); as item) {
        <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-900/50 p-4">
          <section appDialogFocus (dismissed)="closeDelete()" aria-label="Delete résumé" class="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 class="text-xl font-bold">Delete this unused version?</h2><p class="mt-3 break-all text-sm text-slate-600">{{ item.fileName }} will be permanently removed. Submitted attachments cannot be deleted.</p>
            @if (store.actionError()) { <p role="alert" class="mt-3 text-sm text-red-700">{{ store.actionError() }}</p> }
            <div class="mt-6 flex flex-wrap gap-3"><button class="min-h-11 rounded border px-4 py-2" [disabled]="!!store.busy()" (click)="closeDelete()">Keep résumé</button><button class="min-h-11 rounded bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50" [disabled]="!!store.busy()" (click)="remove(item)">Confirm delete</button></div>
          </section>
        </div>
      }
    </main>
  `,
})
export class ResumesComponent implements OnInit {
  protected readonly store = inject(ResumesStore);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly selected = signal<File | null>(null);
  protected readonly deleting = signal<ResumeVersion | null>(null);
  protected readonly current = computed(() => this.store.items().find(item => item.current));
  protected readonly disabled = computed(() => this.store.loading() || !!this.store.busy() || !!this.store.error());
  ngOnInit() { void this.store.load(); }
  protected choose(event: Event) { this.selected.set((event.target as HTMLInputElement).files?.[0] ?? null); }
  protected async upload() {
    const file = this.selected();
    if (file && await this.store.upload(file)) {
      this.selected.set(null);
      const input = this.fileInput(); if (input) input.nativeElement.value = '';
    }
  }
  protected closeDelete() { if (!this.store.busy()) this.deleting.set(null); }
  protected async remove(item: ResumeVersion) { if (await this.store.remove(item)) this.deleting.set(null); }
}
