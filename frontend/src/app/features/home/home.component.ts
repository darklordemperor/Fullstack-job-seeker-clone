import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main>
      <section class="jobsdb-pattern">
        <div class="shell grid min-h-[340px] content-center gap-7 py-10">
          <h1 class="max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">Find work that matches your next chapter</h1>
          <form class="grid gap-3 md:grid-cols-[1fr_260px_auto]" (ngSubmit)="search()">
            <input name="keyword" [(ngModel)]="keyword" aria-label="Job title or keyword" class="h-12 rounded-md border-0 bg-white px-4 text-sm text-slate-900 shadow-sm" placeholder="Job title or keyword">
            <input name="location" [(ngModel)]="location" aria-label="Location" class="h-12 rounded-md border-0 bg-white px-4 text-sm text-slate-900 shadow-sm" placeholder="Location">
            <button class="inline-flex h-12 items-center justify-center rounded-md bg-pink-600 px-7 text-sm font-bold text-white">Search</button>
          </form>
        </div>
      </section>
      <section class="shell grid gap-6 py-10 md:grid-cols-3">
        @for (item of highlights; track item.title) {
          <article class="card-surface p-6">
            <h2 class="text-lg font-bold">{{ item.title }}</h2>
            <p class="mt-3 text-sm leading-6 text-slate-600">{{ item.description }}</p>
          </article>
        }
      </section>
    </main>
  `,
})
export class HomeComponent {
  private readonly router = inject(Router);
  protected keyword = '';
  protected location = '';
  protected readonly highlights = [
    { title: 'Tell your professional story', description: 'Build a profile with your skills, experience, and résumé link for your next application.' },
    { title: 'Keep track of applications', description: 'Apply to open roles and follow each application through its status history.' },
    { title: 'Make hiring decisions together', description: 'Review submitted profiles and keep internal notes as candidates progress through your pipeline.' },
  ];
  protected search(): void {
    void this.router.navigate(['/jobs'], { queryParams: { q: this.keyword.trim() || null, location: this.location.trim() || null } });
  }
}
