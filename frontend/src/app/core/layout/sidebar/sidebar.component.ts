import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="card-surface p-3 text-sm">
      @for (item of items(); track item.href) {
        <a
          [routerLink]="item.href"
          routerLinkActive="bg-blue-50 text-[#1C3F6E]"
          class="flex rounded px-3 py-2 font-semibold text-slate-600"
        >
          {{ item.label }}
        </a>
      }
    </aside>
  `,
})
export class SidebarComponent {
  readonly items = input<{ label: string; href: string }[]>([]);
}
