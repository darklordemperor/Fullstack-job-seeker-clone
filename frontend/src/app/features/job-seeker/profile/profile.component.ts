import { Component, inject, OnInit } from '@angular/core';
import { ExpectedSalaryComponent } from './sections/expected-salary/expected-salary.component';
import { EducationComponent } from './sections/education/education.component';
import { LanguagesComponent } from './sections/languages/languages.component';
import { PersonalInfoComponent } from './sections/personal-info/personal-info.component';
import { SkillsComponent } from './sections/skills/skills.component';
import { WorkExperienceComponent } from './sections/work-experience/work-experience.component';
import { ProfileStore } from './profile.store';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [EducationComponent, ExpectedSalaryComponent, LanguagesComponent, PersonalInfoComponent, SkillsComponent, WorkExperienceComponent],
  providers: [ProfileStore],
  template: `
    <main class="shell max-w-5xl py-0">
      <section class="jobsdb-pattern h-28 rounded-b-lg"></section>
      @if (store.profile(); as profile) {
        <section class="-mt-10 grid gap-8 md:grid-cols-[1fr_280px]">
          <div>
            <div class="flex items-end gap-4">
              <div class="h-20 w-20 rounded-lg bg-slate-200 ring-4 ring-white"></div>
              <div class="pb-2">
                <h1 class="text-3xl font-bold">{{ profile.fullName }}</h1>
                <p class="mt-2 text-sm text-slate-600">Bangkok · {{ profile.phone }}</p>
              </div>
            </div>
            <div class="mt-8 grid gap-8">
              <app-personal-info [profile]="profile" />
              <app-work-experience [experiences]="profile.workExperiences" />
              <app-education-section [educations]="profile.educations" />
            </div>
          </div>
          <aside class="mt-14 grid content-start gap-5">
            <section class="card-surface p-5">
              <h2 class="font-bold">Profile completeness</h2>
              <div class="mt-4 h-2 rounded bg-slate-100">
                <div class="h-2 rounded bg-green-600" [style.width.%]="store.completeness()"></div>
              </div>
              <p class="mt-3 text-sm text-slate-600">{{ store.completeness() }}% complete</p>
            </section>
            <app-expected-salary [salary]="profile.expectedSalary" />
            <app-skills-section [skills]="profile.skills" />
            <app-languages-section [languages]="profile.languages" />
          </aside>
        </section>
      }
    </main>
  `,
})
export class ProfileComponent implements OnInit {
  protected readonly store = inject(ProfileStore);

  ngOnInit(): void {
    this.store.loadData();
  }
}
