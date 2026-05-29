import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    <nav class="flex items-center justify-between gap-3 text-sm">
      <button type="button" class="rounded border px-3 py-2" [disabled]="page() <= 0" (click)="pageChange.emit(page() - 1)">Previous</button>
      <span class="text-slate-600">Page {{ page() + 1 }} of {{ totalPages() }}</span>
      <button type="button" class="rounded border px-3 py-2" [disabled]="page() + 1 >= totalPages()" (click)="pageChange.emit(page() + 1)">Next</button>
    </nav>
  `,
})
export class PaginationComponent {
  readonly page = input(0);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();
}
