import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="inline-flex items-center rounded bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700"><ng-content /></span>`,
})
export class BadgeComponent {
  readonly tone = input<'purple' | 'green' | 'blue'>('purple');
}
