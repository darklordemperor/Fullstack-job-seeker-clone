import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="fixed right-5 top-20 z-50 grid w-[min(360px,calc(100vw-32px))] gap-3">
      @for (toast of toastService.messages(); track toast.id) {
        <button
          type="button"
          class="rounded-md border bg-white px-4 py-3 text-left text-sm shadow-lg"
          [class.border-green-200]="toast.tone === 'success'"
          [class.border-red-200]="toast.tone === 'error'"
          [class.border-blue-200]="toast.tone === 'info'"
          (click)="toastService.dismiss(toast.id)"
        >
          <span
            class="block font-semibold"
            [class.text-green-700]="toast.tone === 'success'"
            [class.text-red-700]="toast.tone === 'error'"
            [class.text-blue-700]="toast.tone === 'info'"
          >
            {{ toast.tone === 'success' ? 'Success' : toast.tone === 'error' ? 'Error' : 'Info' }}
          </span>
          <span class="mt-1 block text-slate-600">{{ toast.message }}</span>
        </button>
      }
    </div>
  `,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
