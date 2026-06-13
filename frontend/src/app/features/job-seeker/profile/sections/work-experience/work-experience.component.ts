import { Component, input } from '@angular/core';
import { WorkExperience } from '../../../../../domain/job-seeker-profile.model';

@Component({
  selector: 'app-work-experience',
  standalone: true,
  template: `
    <section>
      <h2 class="mb-4 text-xl font-bold">Work experience</h2>
      <div class="grid gap-4">
        @for (item of experiences(); track item.company + item.title) {
          <article class="card-surface p-5">
            <h3 class="font-bold">{{ item.title }}</h3>
            <p class="mt-1 text-sm text-slate-700">{{ item.company }}</p>
            <p class="mt-3 text-sm leading-6 text-slate-600">{{ item.description }}</p>
          </article>
        }
      </div>
    </section>
  `,
})
export class WorkExperienceComponent {
  readonly experiences = input<WorkExperience[]>([]);
}
