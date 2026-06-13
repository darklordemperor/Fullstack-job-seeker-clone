import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { JobSeekerProfile } from '../../../domain/job-seeker-profile.model';
import { ProfileStore } from './profile.store';

type DrawerSection = 'personal' | 'summary' | 'skills' | 'languages' | 'education' | 'licenses' | null;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  providers: [ProfileStore],
  template: `
    <main class="shell max-w-5xl pb-12">
      <section class="jobsdb-pattern h-32 rounded-b-xl"></section>
      @if (store.profile(); as profile) {
        <section class="-mt-9 grid gap-8 px-6 md:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <div>
              <div class="relative">
                <button type="button" class="grid h-20 w-20 overflow-hidden rounded-lg bg-slate-200 text-2xl font-black text-slate-500 ring-4 ring-white" (click)="avatarMenu.set(!avatarMenu())">
                  @if (profile.profileImageUrl) {
                    <img [src]="profile.profileImageUrl" alt="Profile image" class="h-full w-full object-cover">
                  } @else {
                    <span class="place-self-center">{{ initials(profile.fullName) }}</span>
                  }
                </button>
                @if (avatarMenu()) {
                  <div class="absolute left-0 top-24 z-20 w-44 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg">
                    <button type="button" class="w-full rounded px-3 py-2 text-left font-semibold hover:bg-blue-50" (click)="avatarInput.click()">Upload image</button>
                    <p class="px-3 pb-2 text-xs text-slate-500">JPG or PNG up to 5 MB. Cropped to a 256 x 256 avatar.</p>
                  </div>
                }
                <input #avatarInput type="file" class="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" (change)="uploadImage($event)">
              </div>
              <div class="mt-4">
                <div class="flex items-center gap-3">
                  <h1 class="text-2xl font-bold">{{ profile.fullName || 'Complete your profile' }}</h1>
                  <button type="button" class="text-sm font-bold text-[#174ea6]" (click)="open('personal')">Edit</button>
                </div>
                <p class="mt-2 text-sm text-slate-600">{{ profile.location || 'Add your location' }} · {{ profile.phone || 'Add phone number' }}</p>
                @if (profile.resumeUrl) {
                  <a [href]="profile.resumeUrl" class="mt-1 block text-xs font-semibold text-[#174ea6]">View attached resume</a>
                }
              </div>
            </div>

            <section class="mt-8">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold">Profile summary</h2>
                <button type="button" class="text-sm font-bold text-[#174ea6]" (click)="open('summary')">Edit</button>
              </div>
              <article class="card-surface mt-3 p-5">
                <p class="text-sm leading-6 text-slate-700">{{ profile.summary || 'Add a short summary so employers can quickly understand your experience and goals.' }}</p>
              </article>
            </section>

            <section class="mt-8">
              <h2 class="text-xl font-bold">Work experience</h2>
              <div class="mt-3 grid gap-3">
                @for (item of profile.workExperiences; track item.company + item.title) {
                  <article class="card-surface p-5">
                    <h3 class="font-bold">{{ item.title }}</h3>
                    <p class="mt-1 text-sm text-slate-700">{{ item.company }}</p>
                    <p class="mt-3 text-sm leading-6 text-slate-600">{{ item.description }}</p>
                  </article>
                } @empty {
                  <article class="card-surface p-5 text-sm text-slate-500">Add work history through the API profile payload.</article>
                }
              </div>
            </section>

            <section class="mt-8">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold">Education</h2>
                <button type="button" class="text-sm font-bold text-[#174ea6]" (click)="open('education')">Add or edit</button>
              </div>
              <div class="mt-3 grid gap-3">
                @for (item of profile.educations; track item.institution + item.degree) {
                  <article class="card-surface p-5">
                    <h3 class="font-bold">{{ item.degree || item.fieldOfStudy }}</h3>
                    <p class="mt-1 text-sm text-slate-700">{{ item.institution }}</p>
                    <p class="mt-3 text-sm text-slate-600">{{ item.fieldOfStudy }} · {{ item.graduationYear }}</p>
                  </article>
                } @empty {
                  <article class="card-surface p-5 text-sm text-slate-500">No education added yet.</article>
                }
              </div>
            </section>

            <section class="mt-8">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold">Licences and certifications</h2>
                <button type="button" class="text-sm font-bold text-[#174ea6]" (click)="open('licenses')">Add or edit</button>
              </div>
              <div class="mt-3 grid gap-3">
                @for (item of profile.licenses; track item.name + item.issuer) {
                  <article class="card-surface p-5">
                    <h3 class="font-bold">{{ item.name }}</h3>
                    <p class="mt-1 text-sm text-slate-600">{{ item.issuer }} · Issued {{ item.issuedYear }}</p>
                  </article>
                } @empty {
                  <article class="card-surface p-5 text-sm text-slate-500">No certifications added yet.</article>
                }
              </div>
            </section>

            <section class="mt-8">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold">Skills</h2>
                <button type="button" class="text-sm font-bold text-[#174ea6]" (click)="open('skills')">Edit</button>
              </div>
              <article class="card-surface mt-3 flex flex-wrap gap-2 p-5">
                @for (skill of profile.skills; track skill.name) {
                  <span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-[#174ea6]">{{ skill.name }}</span>
                } @empty {
                  <span class="text-sm text-slate-500">Add your strongest skills.</span>
                }
              </article>
            </section>

            <section class="mt-8">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold">Languages</h2>
                <button type="button" class="text-sm font-bold text-[#174ea6]" (click)="open('languages')">Edit</button>
              </div>
              <article class="card-surface mt-3 grid gap-3 p-5">
                @for (language of profile.languages; track language.language) {
                  <div class="flex justify-between text-sm"><span class="font-semibold">{{ language.language }}</span><span class="text-slate-500">{{ language.proficiency }}</span></div>
                } @empty {
                  <span class="text-sm text-slate-500">No languages added yet.</span>
                }
              </article>
            </section>
          </div>

          <aside class="mt-16 grid content-start gap-5">
            <section class="border-b border-slate-200 pb-5">
              <p class="text-sm font-bold">Profile visibility</p>
              <p class="mt-2 text-xs text-slate-500">Searchable by employers</p>
            </section>
            <section class="card-surface p-5">
              <h2 class="font-bold">Profile completeness</h2>
              <div class="mt-4 h-2 rounded bg-slate-100"><div class="h-2 rounded bg-emerald-600" [style.width.%]="store.completeness()"></div></div>
              <p class="mt-3 text-sm text-slate-600">{{ store.completeness() }}% complete</p>
            </section>
            <a routerLink="/job-seeker/my-applications" class="card-surface p-4 text-sm font-bold text-[#174ea6]">Track my applications →</a>
          </aside>
        </section>
      } @else if (store.loading()) {
        <section class="p-12 text-center text-sm text-slate-500">Loading your profile...</section>
      } @else {
        <section class="p-12 text-center">
          <h1 class="text-xl font-bold">Sign in with a real job seeker account</h1>
          <p class="mt-2 text-sm text-slate-500">Profile editing uses your authenticated Spring Boot API and PostgreSQL record.</p>
        </section>
      }
    </main>

    @if (drawer(); as activeDrawer) {
      <div class="fixed inset-0 z-50 bg-slate-950/45" (click)="close()"></div>
      <aside class="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-[#174ea6]">Profile editor</p>
            <h2 class="mt-1 text-xl font-bold">{{ drawerTitle(activeDrawer) }}</h2>
          </div>
          <button type="button" class="text-xl text-slate-500" (click)="close()">×</button>
        </div>

        @if (draft(); as form) {
          @switch (activeDrawer) {
            @case ('personal') {
              <div class="mt-6 grid gap-4">
                <label class="grid gap-1 text-sm font-semibold">Full name<input class="rounded border px-3 py-2 font-normal" [ngModel]="form.fullName" (ngModelChange)="patchDraft({ fullName: $event })"></label>
                <label class="grid gap-1 text-sm font-semibold">Location<input class="rounded border px-3 py-2 font-normal" [ngModel]="form.location" (ngModelChange)="patchDraft({ location: $event })"></label>
                <label class="grid gap-1 text-sm font-semibold">Phone<input class="rounded border px-3 py-2 font-normal" [ngModel]="form.phone" (ngModelChange)="patchDraft({ phone: $event })"></label>
                <label class="grid gap-1 text-sm font-semibold">Nationality<input class="rounded border px-3 py-2 font-normal" [ngModel]="form.nationality" (ngModelChange)="patchDraft({ nationality: $event })"></label>
              </div>
            }
            @case ('summary') {
              <label class="mt-6 grid gap-1 text-sm font-semibold">Summary<textarea rows="10" class="rounded border px-3 py-2 font-normal" [ngModel]="form.summary" (ngModelChange)="patchDraft({ summary: $event })"></textarea></label>
            }
            @case ('skills') {
              <div class="mt-6 flex gap-2">
                <input class="min-w-0 flex-1 rounded border px-3 py-2 text-sm" placeholder="Add a skill" [ngModel]="newSkill()" (ngModelChange)="newSkill.set($event)">
                <button type="button" class="rounded bg-[#174ea6] px-4 text-sm font-bold text-white" (click)="addSkill()">Add</button>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                @for (skill of form.skills; track skill.name) {
                  <button type="button" class="rounded-full bg-slate-100 px-3 py-2 text-xs" (click)="removeSkill(skill.name)">{{ skill.name }} ×</button>
                }
              </div>
            }
            @case ('languages') {
              <div class="mt-6 grid grid-cols-[1fr_1fr_auto] gap-2">
                <input class="rounded border px-3 py-2 text-sm" placeholder="Language" [ngModel]="newLanguage()" (ngModelChange)="newLanguage.set($event)">
                <input class="rounded border px-3 py-2 text-sm" placeholder="Proficiency" [ngModel]="newProficiency()" (ngModelChange)="newProficiency.set($event)">
                <button type="button" class="rounded bg-[#174ea6] px-3 text-sm font-bold text-white" (click)="addLanguage()">Add</button>
              </div>
              <div class="mt-4 grid gap-2">
                @for (language of form.languages; track language.language) {
                  <button type="button" class="flex justify-between rounded border px-3 py-2 text-left text-sm" (click)="removeLanguage(language.language)"><span>{{ language.language }} · {{ language.proficiency }}</span><span>×</span></button>
                }
              </div>
            }
            @case ('education') {
              <div class="mt-6 grid gap-3">
                <input class="rounded border px-3 py-2 text-sm" placeholder="Institution" [ngModel]="educationInstitution()" (ngModelChange)="educationInstitution.set($event)">
                <input class="rounded border px-3 py-2 text-sm" placeholder="Degree" [ngModel]="educationDegree()" (ngModelChange)="educationDegree.set($event)">
                <input class="rounded border px-3 py-2 text-sm" placeholder="Field of study" [ngModel]="educationField()" (ngModelChange)="educationField.set($event)">
                <input type="number" class="rounded border px-3 py-2 text-sm" placeholder="Graduation year" [ngModel]="educationYear()" (ngModelChange)="educationYear.set($event)">
                <button type="button" class="rounded border border-[#174ea6] px-3 py-2 text-sm font-bold text-[#174ea6]" (click)="addEducation()">Add education</button>
              </div>
              <div class="mt-4 grid gap-2">
                @for (item of form.educations; track item.institution + item.degree) {
                  <button type="button" class="flex justify-between rounded border px-3 py-2 text-left text-sm" (click)="removeEducation($index)"><span>{{ item.degree }} · {{ item.institution }}</span><span>×</span></button>
                }
              </div>
            }
            @case ('licenses') {
              <div class="mt-6 grid gap-3">
                <input class="rounded border px-3 py-2 text-sm" placeholder="Certification or licence" [ngModel]="licenseName()" (ngModelChange)="licenseName.set($event)">
                <input class="rounded border px-3 py-2 text-sm" placeholder="Issuing organisation" [ngModel]="licenseIssuer()" (ngModelChange)="licenseIssuer.set($event)">
                <input type="number" class="rounded border px-3 py-2 text-sm" placeholder="Issued year" [ngModel]="licenseYear()" (ngModelChange)="licenseYear.set($event)">
                <button type="button" class="rounded border border-[#174ea6] px-3 py-2 text-sm font-bold text-[#174ea6]" (click)="addLicense()">Add certification</button>
              </div>
              <div class="mt-4 grid gap-2">
                @for (item of form.licenses; track item.name + item.issuer) {
                  <button type="button" class="flex justify-between rounded border px-3 py-2 text-left text-sm" (click)="removeLicense($index)"><span>{{ item.name }} · {{ item.issuer }}</span><span>×</span></button>
                }
              </div>
            }
          }
          <div class="mt-8 flex gap-3 border-t pt-5">
            <button type="button" class="rounded bg-[#174ea6] px-5 py-2 text-sm font-bold text-white" (click)="save()">Save</button>
            <button type="button" class="rounded px-4 py-2 text-sm font-bold text-[#174ea6]" (click)="close()">Cancel</button>
          </div>
        }
      </aside>
    }
  `,
})
export class ProfileComponent implements OnInit {
  protected readonly store = inject(ProfileStore);
  protected readonly drawer = signal<DrawerSection>(null);
  protected readonly draft = signal<JobSeekerProfile | null>(null);
  protected readonly avatarMenu = signal(false);
  protected readonly newSkill = signal('');
  protected readonly newLanguage = signal('');
  protected readonly newProficiency = signal('');
  protected readonly educationInstitution = signal('');
  protected readonly educationDegree = signal('');
  protected readonly educationField = signal('');
  protected readonly educationYear = signal<number | null>(null);
  protected readonly licenseName = signal('');
  protected readonly licenseIssuer = signal('');
  protected readonly licenseYear = signal<number | null>(null);

  ngOnInit(): void {
    this.store.loadData();
  }

  protected open(section: Exclude<DrawerSection, null>): void {
    const profile = this.store.profile();
    if (!profile) {
      return;
    }
    this.draft.set(structuredClone(profile));
    this.drawer.set(section);
  }

  protected close(): void {
    this.drawer.set(null);
    this.draft.set(null);
  }

  protected save(): void {
    const profile = this.draft();
    if (!profile) {
      return;
    }
    this.store.save(profile);
    this.close();
  }

  protected patchDraft(change: Partial<JobSeekerProfile>): void {
    const profile = this.draft();
    if (profile) {
      this.draft.set({ ...profile, ...change });
    }
  }

  protected addSkill(): void {
    const name = this.newSkill().trim();
    const profile = this.draft();
    if (name && profile && !profile.skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
      this.patchDraft({ skills: [...profile.skills, { name }] });
      this.newSkill.set('');
    }
  }

  protected removeSkill(name: string): void {
    const profile = this.draft();
    if (profile) {
      this.patchDraft({ skills: profile.skills.filter((skill) => skill.name !== name) });
    }
  }

  protected addLanguage(): void {
    const language = this.newLanguage().trim();
    const profile = this.draft();
    if (language && profile) {
      this.patchDraft({ languages: [...profile.languages.filter((item) => item.language !== language), { language, proficiency: this.newProficiency().trim() }] });
      this.newLanguage.set('');
      this.newProficiency.set('');
    }
  }

  protected removeLanguage(language: string): void {
    const profile = this.draft();
    if (profile) {
      this.patchDraft({ languages: profile.languages.filter((item) => item.language !== language) });
    }
  }

  protected addEducation(): void {
    const institution = this.educationInstitution().trim();
    const profile = this.draft();
    if (institution && profile) {
      this.patchDraft({ educations: [...profile.educations, { institution, degree: this.educationDegree().trim(), fieldOfStudy: this.educationField().trim(), graduationYear: this.educationYear() }] });
      this.educationInstitution.set('');
      this.educationDegree.set('');
      this.educationField.set('');
      this.educationYear.set(null);
    }
  }

  protected removeEducation(index: number): void {
    const profile = this.draft();
    if (profile) {
      this.patchDraft({ educations: profile.educations.filter((_, itemIndex) => itemIndex !== index) });
    }
  }

  protected addLicense(): void {
    const name = this.licenseName().trim();
    const profile = this.draft();
    if (name && profile) {
      this.patchDraft({ licenses: [...profile.licenses, { name, issuer: this.licenseIssuer().trim(), issuedYear: this.licenseYear() }] });
      this.licenseName.set('');
      this.licenseIssuer.set('');
      this.licenseYear.set(null);
    }
  }

  protected removeLicense(index: number): void {
    const profile = this.draft();
    if (profile) {
      this.patchDraft({ licenses: profile.licenses.filter((_, itemIndex) => itemIndex !== index) });
    }
  }

  protected uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.store.uploadImage(file);
      this.avatarMenu.set(false);
      input.value = '';
    }
  }

  protected initials(fullName: string | null | undefined): string {
    return (fullName || 'JS').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  protected drawerTitle(section: Exclude<DrawerSection, null>): string {
    return {
      personal: 'Edit personal details',
      summary: 'Edit profile summary',
      skills: 'Edit skills',
      languages: 'Edit languages',
      education: 'Add education',
      licenses: 'Add licence or certification',
    }[section];
  }
}
