import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <section class="jobsdb-pattern">
        <div class="shell grid min-h-[340px] content-center gap-7 py-10">
          <h1 class="max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">Find work that matches your next chapter</h1>
          <form class="grid gap-3 md:grid-cols-[1fr_260px_auto]">
            <input class="h-12 rounded-md border-0 px-4 text-sm shadow-sm" placeholder="Job title, company, or keyword">
            <input class="h-12 rounded-md border-0 px-4 text-sm shadow-sm" placeholder="Location">
            <a routerLink="/jobs" class="inline-flex h-12 items-center justify-center rounded-md bg-pink-600 px-7 text-sm font-bold text-white">Search</a>
          </form>
          <div class="flex flex-wrap gap-2">
            @for (filter of ['Salary', 'Type', 'Date posted', 'Work from home']; track filter) {
              <span class="rounded-full border border-white/70 px-4 py-2 text-sm font-semibold text-white">{{ filter }}</span>
            }
          </div>
        </div>
      </section>
      <section class="shell grid gap-6 py-10 md:grid-cols-3">
        @for (item of ['Create a public profile', 'Apply with one click', 'Manage employer hiring']; track item) {
          <article class="card-surface p-6">
            <h2 class="text-lg font-bold">{{ item }}</h2>
            <p class="mt-3 text-sm leading-6 text-slate-600">Use the scaffolded JobsDB workflow with role-aware routes and API-backed repositories.</p>
          </article>
        }
      </section>
    </main>
  `,
})
export class HomeComponent {
}
