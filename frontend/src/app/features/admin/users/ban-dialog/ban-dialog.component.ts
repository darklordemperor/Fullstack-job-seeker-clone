import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-ban-dialog',
  standalone: true,
  imports: [FormsModule, ModalComponent],
  template: `
    <app-modal [open]="open()" title="Ban user" (closed)="closed.emit()">
      <textarea class="min-h-28 w-full rounded border border-slate-300 p-3" placeholder="Reason" [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
      <button type="button" class="mt-4 rounded bg-pink-600 px-5 py-3 text-sm font-bold text-white" [disabled]="!reason().trim()" (click)="confirmed.emit(reason())">Ban user</button>
    </app-modal>
  `,
})
export class BanDialogComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<string>();
  protected readonly reason = signal('');
}
