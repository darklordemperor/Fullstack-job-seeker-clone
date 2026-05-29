import { Component, input } from '@angular/core';
import { Language } from '../../../../../domain/job-seeker-profile.model';

@Component({
  selector: 'app-languages-section',
  standalone: true,
  template: `
    <section class="card-surface p-5">
      <h2 class="text-lg font-bold">Languages</h2>
      <div class="mt-4 grid gap-2 text-sm text-slate-700">
        @for (item of languages(); track item.language) {
          <span>{{ item.language }} · {{ item.proficiency }}</span>
        }
      </div>
    </section>
  `,
})
export class LanguagesComponent {
  readonly languages = input<Language[]>([]);
}
