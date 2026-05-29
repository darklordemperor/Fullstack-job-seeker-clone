import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      type="button"
      class="inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
      [class.bg-pink-600]="variant() === 'primary'"
      [class.text-white]="variant() === 'primary'"
      [class.bg-slate-100]="variant() === 'secondary'"
      [class.text-slate-800]="variant() === 'secondary'"
      [class.border]="variant() === 'outline'"
      [class.border-slate-300]="variant() === 'outline'"
      [class.text-slate-900]="variant() === 'outline'"
      [disabled]="disabled()"
      (click)="pressed.emit()"
    >
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'outline'>('primary');
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
