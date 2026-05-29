import { Component, input } from '@angular/core';
import { JobSeekerProfile } from '../../../../../domain/job-seeker-profile.model';

@Component({
  selector: 'app-personal-info',
  standalone: true,
  template: `
    @if (profile(); as profile) {
      <section class="card-surface p-5">
        <div class="flex items-start justify-between">
          <h2 class="text-lg font-bold">Profile summary</h2>
          <button type="button" class="text-[#1C3F6E]">✎</button>
        </div>
        <p class="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{{ profile.fullName }} is a frontend and mobile developer with Angular, React Native, Flutter, and cloud experience.</p>
      </section>
    }
  `,
})
export class PersonalInfoComponent {
  readonly profile = input<JobSeekerProfile | null>(null);
}
