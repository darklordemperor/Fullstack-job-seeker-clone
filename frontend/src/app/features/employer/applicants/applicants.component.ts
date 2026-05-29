import { Component } from '@angular/core';

@Component({
  selector: 'app-applicants',
  standalone: true,
  template: `
    <main class="shell py-8">
      <h1 class="text-2xl font-bold">Applicants</h1>
      <section class="mt-6 card-surface p-5">
        <p class="text-sm text-slate-600">Applicant review workflow scaffold.</p>
      </section>
    </main>
  `,
})
export class ApplicantsComponent {
}
