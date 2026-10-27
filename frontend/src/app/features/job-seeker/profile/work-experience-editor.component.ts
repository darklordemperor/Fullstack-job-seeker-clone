import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkExperience } from '../../../domain/job-seeker-profile.model';

@Component({
  selector: 'app-work-experience-editor', standalone: true, imports: [FormsModule],
  template: `
    <p class="mt-5 text-sm leading-6 text-slate-600">Share your roles, responsibilities and achievements. Leave the end date blank for an ongoing role or an unspecified end date.</p>
    <div class="mt-5 grid gap-5">
      @for (item of experiences(); track $index; let i = $index) {
        <fieldset class="min-w-0 rounded-xl border border-slate-200 p-4">
          <legend class="px-2 text-sm font-bold">Experience {{ i + 1 }}</legend>
          <div class="grid gap-4">
            <label class="grid gap-1 text-sm font-semibold">Job title <span class="sr-only">for experience {{ i + 1 }}</span>
              <input required maxlength="180" class="w-full rounded border px-3 py-2 font-normal" [ngModel]="item.title" (ngModelChange)="patch(i, { title: $event })">
            </label>
            <label class="grid gap-1 text-sm font-semibold">Company <span class="sr-only">for experience {{ i + 1 }}</span>
              <input required maxlength="180" class="w-full rounded border px-3 py-2 font-normal" [ngModel]="item.company" (ngModelChange)="patch(i, { company: $event })">
            </label>
            <label class="grid gap-1 text-sm font-semibold">Start date <span class="sr-only">for experience {{ i + 1 }}</span>
              <input type="date" class="w-full rounded border px-3 py-2 font-normal" [ngModel]="item.startDate" (ngModelChange)="patch(i, { startDate: $event || null })">
            </label>
            <label class="grid gap-1 text-sm font-semibold">End date <span class="sr-only">for experience {{ i + 1 }}</span>
              <input type="date" class="w-full rounded border px-3 py-2 font-normal" [min]="item.startDate || ''" [ngModel]="item.endDate" (ngModelChange)="patch(i, { endDate: $event || null })">
            </label>
            <label class="grid gap-1 text-sm font-semibold">Responsibilities and achievements <span class="sr-only">for experience {{ i + 1 }}</span>
              <textarea rows="4" class="w-full rounded border px-3 py-2 font-normal" [ngModel]="item.description" (ngModelChange)="patch(i, { description: $event })"></textarea>
            </label>
            <button type="button" [attr.aria-label]="'Remove experience ' + (i + 1)" class="min-h-11 justify-self-start rounded px-2 text-sm font-semibold text-red-700" (click)="remove(i)">Remove experience</button>
          </div>
        </fieldset>
      } @empty {
        <p class="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No roles added. Add your most recent experience to get started.</p>
      }
    </div>
    <button type="button" class="mt-5 min-h-11 w-full rounded-lg border border-[#174ea6] px-4 py-2 text-sm font-bold text-[#174ea6] disabled:opacity-50" [disabled]="experiences().length >= 100" (click)="add()">Add experience</button>
  `,
})
export class WorkExperienceEditorComponent {
  readonly experiences = input.required<WorkExperience[]>();
  readonly experiencesChange = output<WorkExperience[]>();
  protected patch(index: number, change: Partial<WorkExperience>): void {
    this.experiencesChange.emit(this.experiences().map((item, i) => i === index ? { ...item, ...change } : item));
  }
  protected add(): void {
    if (this.experiences().length < 100) this.experiencesChange.emit([...this.experiences(), { company: '', title: '', startDate: null, endDate: null, description: '' }]);
  }
  protected remove(index: number): void { this.experiencesChange.emit(this.experiences().filter((_, i) => i !== index)); }
}
