import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    <nav class="flex items-center justify-center gap-1 pt-3 text-sm" aria-label="Job result pages">
      @if (page() > 0) {
        <button type="button" class="rounded-md px-3 py-2 font-semibold text-[#174ea6] hover:bg-blue-50" (click)="pageChange.emit(page() - 1)">‹</button>
      }
      @for (pageNumber of pages(); track pageNumber) {
        <button
          type="button"
          class="h-9 min-w-9 rounded-md px-3 font-semibold"
          [class.bg-blue-50]="page() === pageNumber"
          [class.text-[#174ea6]]="page() === pageNumber"
          [class.text-slate-600]="page() !== pageNumber"
          (click)="pageChange.emit(pageNumber)"
        >
          {{ pageNumber + 1 }}
        </button>
      }
      @if (page() + 1 < totalPages()) {
        <button type="button" class="rounded-md px-3 py-2 font-semibold text-[#174ea6] hover:bg-blue-50" (click)="pageChange.emit(page() + 1)">Next ›</button>
      }
    </nav>
  `,
})
export class PaginationComponent {
  readonly page = input(0);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();
  readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index));
}
