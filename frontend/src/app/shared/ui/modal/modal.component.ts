import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 p-4">
        <section class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ title() }}</h2>
            <button type="button" class="text-xl leading-none text-slate-500" (click)="closed.emit()">×</button>
          </div>
          <ng-content />
        </section>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly closed = output<void>();
}
