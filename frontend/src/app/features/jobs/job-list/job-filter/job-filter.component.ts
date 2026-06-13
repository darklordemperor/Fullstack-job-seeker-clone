import { Component, HostListener, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ShellUiService } from '../../../../core/layout/shell-ui.service';
import { JobFilter } from '../../../../domain/job.model';

@Component({
  selector: 'app-job-filter',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section
      class="jobsdb-search-bar sticky z-30 border-b border-blue-950/40 shadow-md transition-all duration-300"
      [class.py-2]="shell.searchCompact()"
      [class.py-4]="!shell.searchCompact()"
      [style.top.px]="shell.navbarHeight()"
    >
      <form class="shell grid items-center gap-3 md:grid-cols-[1fr_260px_auto]" (ngSubmit)="submit()">
        <input
          class="rounded-md border-0 bg-white px-4 text-sm shadow-sm transition-all duration-300"
          [class.h-9]="shell.searchCompact()"
          [class.h-11]="!shell.searchCompact()"
          [placeholder]="language.text('Job title, company, or keyword', 'ตำแหน่งงาน บริษัท หรือคำค้นหา')"
          [ngModel]="keyword()"
          (ngModelChange)="keyword.set($event)"
          name="keyword"
        >
        <input
          class="rounded-md border-0 bg-white px-4 text-sm shadow-sm transition-all duration-300"
          [class.h-9]="shell.searchCompact()"
          [class.h-11]="!shell.searchCompact()"
          [placeholder]="language.text('Location', 'สถานที่ทำงาน')"
          [ngModel]="location()"
          (ngModelChange)="location.set($event)"
          name="location"
        >
        <button type="submit" class="rounded-md bg-pink-600 px-8 text-sm font-bold text-white transition-all duration-300" [class.h-9]="shell.searchCompact()" [class.h-11]="!shell.searchCompact()">
          {{ language.text('Search', 'ค้นหา') }}
        </button>
      </form>
      @if (!shell.searchCompact()) {
        <div class="shell mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
          @for (chip of chips(); track chip) {
            <button type="button" class="rounded-full border border-white/80 bg-[#08245c] px-4 py-1.5 text-xs font-semibold text-white">{{ chip }}</button>
          }
        </div>
      }
    </section>
  `,
})
export class JobFilterComponent implements OnInit {
  readonly search = output<JobFilter>();
  protected readonly language = inject(LanguageService);
  protected readonly shell = inject(ShellUiService);
  protected readonly keyword = signal('');
  protected readonly location = signal('');

  ngOnInit(): void {
    this.onScroll();
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.shell.searchCompact.set(window.scrollY > 180);
  }

  protected submit(): void {
    this.search.emit({ q: this.keyword().trim(), location: this.location().trim(), page: 0, size: 8 });
  }

  protected chips(): string[] {
    return this.language.current() === 'TH'
      ? ['เงินเดือน', 'ประเภทงาน', 'วันที่ประกาศ', 'สายงาน', 'บริษัท']
      : ['Salary', 'Type', 'Date posted', 'Industry', 'Company'];
  }
}
