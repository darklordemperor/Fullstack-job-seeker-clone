import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-delete-application-dialog',
  standalone: true,
  imports: [FormsModule, ModalComponent],
  template: `
    <app-modal [open]="open()" title="Delete application" (closed)="closed.emit()">
      <p class="mb-3 text-sm text-slate-600">Provide a moderation reason. This action removes the application record.</p>
      <textarea class="min-h-28 w-full rounded border border-slate-300 p-3" placeholder="Reason for deletion" [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
      <button type="button" class="mt-4 rounded bg-red-600 px-5 py-3 text-sm font-bold text-white" [disabled]="!reason().trim()" (click)="confirmed.emit(reason())">Delete application</button>
    </app-modal>
  `,
})
export class DeleteApplicationDialogComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<string>();
  protected readonly reason = signal('');
}
