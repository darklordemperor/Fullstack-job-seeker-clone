import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="animate-pulse rounded-md bg-slate-100" [style.height.px]="height()" [style.width]="width()"></div>
  `,
})
export class SkeletonComponent {
  readonly height = input(24);
  readonly width = input('100%');
}
