import { Component, input, output } from '@angular/core';
import { DialogFocusDirective } from './dialog-focus.directive';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [DialogFocusDirective],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
        <section appDialogFocus [attr.aria-label]="title()" (dismissed)="closed.emit()" class="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ title() }}</h2>
            <button type="button" aria-label="Close dialog" class="min-h-11 min-w-11 text-xl leading-none text-slate-500" (click)="closed.emit()">×</button>
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
