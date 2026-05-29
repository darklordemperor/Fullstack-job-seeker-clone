import { Component, input } from '@angular/core';
import { Education } from '../../../../../domain/job-seeker-profile.model';

@Component({
  selector: 'app-education-section',
  standalone: true,
  template: `
    <section>
      <h2 class="mb-4 text-xl font-bold">Education</h2>
      @for (item of educations(); track item.institution) {
        <article class="card-surface p-5">
          <h3 class="font-bold">{{ item.degree }}</h3>
          <p class="mt-1 text-sm text-slate-700">{{ item.institution }}</p>
          <p class="mt-3 text-sm text-slate-600">{{ item.fieldOfStudy }} · {{ item.graduationYear }}</p>
        </article>
      }
    </section>
  `,
})
export class EducationComponent {
  readonly educations = input<Education[]>([]);
}
