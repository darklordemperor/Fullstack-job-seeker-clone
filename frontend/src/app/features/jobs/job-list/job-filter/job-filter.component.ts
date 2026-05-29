import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JobFilter } from '../../../../domain/job.model';

@Component({
  selector: 'app-job-filter',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="jobsdb-pattern py-5">
      <form class="shell grid gap-3 md:grid-cols-[1fr_260px_auto]" (ngSubmit)="search.emit({ q: keyword(), location: location(), page: 0, size: 20 })">
        <input class="h-12 rounded-md border-0 px-4 text-sm shadow-sm" placeholder="Job title, company, or keyword" [ngModel]="keyword()" (ngModelChange)="keyword.set($event)" name="keyword">
        <input class="h-12 rounded-md border-0 px-4 text-sm shadow-sm" placeholder="Location" [ngModel]="location()" (ngModelChange)="location.set($event)" name="location">
        <button type="submit" class="h-12 rounded-md bg-pink-600 px-8 text-sm font-bold text-white">Search</button>
      </form>
      <div class="shell mt-4 flex flex-wrap gap-2">
        @for (chip of ['Salary', 'Type', 'Date posted', 'Industry', 'Company']; track chip) {
          <button type="button" class="rounded-full border border-white/75 px-4 py-2 text-sm font-semibold text-white">{{ chip }}</button>
        }
      </div>
    </section>
  `,
})
export class JobFilterComponent {
  readonly search = output<JobFilter>();
  protected readonly keyword = signal('');
  protected readonly location = signal('');
}
