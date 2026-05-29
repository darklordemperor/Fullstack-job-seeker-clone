import { Component, input } from '@angular/core';
import { Skill } from '../../../../../domain/job-seeker-profile.model';

@Component({
  selector: 'app-skills-section',
  standalone: true,
  template: `
    <section class="card-surface p-5">
      <h2 class="text-lg font-bold">Skills</h2>
      <div class="mt-4 flex flex-wrap gap-2">
        @for (skill of skills(); track skill.name) {
          <span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1C3F6E]">{{ skill.name }} · {{ skill.level }}</span>
        }
      </div>
    </section>
  `,
})
export class SkillsComponent {
  readonly skills = input<Skill[]>([]);
}
