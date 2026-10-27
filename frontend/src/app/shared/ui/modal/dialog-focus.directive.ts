import { afterNextRender, Directive, ElementRef, inject, OnDestroy, output } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Directive({
  selector: '[appDialogFocus]', standalone: true,
  host: { role: 'dialog', 'aria-modal': 'true', tabindex: '-1', '(keydown)': 'keydown($event)' },
})
export class DialogFocusDirective implements OnDestroy {
  readonly dismissed = output<void>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly previous = this.document.activeElement as HTMLElement | null;
  constructor() {
    afterNextRender(() => (this.controls()[0] ?? this.element).focus());
  }
  protected keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.dismissed.emit(); return; }
    if (event.key !== 'Tab') return;
    const controls = this.controls();
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); this.element.focus(); }
    else if (event.shiftKey && (this.document.activeElement === first || this.document.activeElement === this.element)) {
      event.preventDefault(); last!.focus();
    } else if (!event.shiftKey && (this.document.activeElement === last || this.document.activeElement === this.element)) {
      event.preventDefault(); first.focus();
    }
  }
  ngOnDestroy(): void { if (this.previous?.isConnected) this.previous.focus(); }
  private controls(): HTMLElement[] {
    return [...this.element.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')]
      .filter(element => !element.matches(':disabled, [tabindex="-1"]') && element.getClientRects().length > 0);
  }
}
