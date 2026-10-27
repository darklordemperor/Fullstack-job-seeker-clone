import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SavedSearchInput } from '../../../domain/saved-search.model';
import { SalaryRangePipe } from '../../../shared/pipes/salary-range.pipe';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SavedSearchesStore } from './saved-searches.store';

@Component({
  selector:'app-saved-searches',standalone:true,
  imports:[FormsModule,RouterLink,SalaryRangePipe,PaginationComponent],providers:[SavedSearchesStore],
  template:`<main class="shell py-8 sm:py-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="text-sm font-semibold text-blue-700">Your job search</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Saved searches & alerts</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Keep the searches that matter. Get an in-app update when a newly published job matches your criteria.</p></div>
      <a routerLink="/notifications" class="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-blue-800">Open notifications</a>
    </div>
    <div class="mt-7 grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section class="card-surface min-w-0 p-5 sm:p-6" aria-label="Create saved search">
        <h2 class="text-lg font-bold">Create a search</h2><p class="mt-2 text-xs leading-5 text-slate-500">Use keywords, a location or a salary range. You can keep up to 20 searches.</p>
        <form class="mt-5 grid gap-4" (ngSubmit)="save()" #form="ngForm">
          <label class="grid gap-2 text-sm font-semibold">Search name<input class="h-11 min-w-0 rounded-lg border border-slate-300 px-3 font-normal" name="name" required maxlength="80" [(ngModel)]="draft.name" placeholder="Bangkok engineering roles"></label>
          <label class="grid gap-2 text-sm font-semibold">Keyword<input class="h-11 min-w-0 rounded-lg border border-slate-300 px-3 font-normal" name="query" maxlength="150" [(ngModel)]="draft.query" placeholder="Java, designer, analyst…"></label>
          <label class="grid gap-2 text-sm font-semibold">Location<input class="h-11 min-w-0 rounded-lg border border-slate-300 px-3 font-normal" name="location" maxlength="100" [(ngModel)]="draft.location" placeholder="Bangkok"></label>
          <fieldset><legend class="text-sm font-semibold">Advertised salary range</legend>
            <div class="mt-2 grid grid-cols-2 gap-3">
              <label class="grid min-w-0 gap-1 text-xs text-slate-600">Minimum salary<input class="h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm" type="number" min="0" max="2147483647" step="1" name="salaryMin" [(ngModel)]="draft.salaryMin"></label>
              <label class="grid min-w-0 gap-1 text-xs text-slate-600">Maximum salary<input class="h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm" type="number" min="0" max="2147483647" step="1" name="salaryMax" [(ngModel)]="draft.salaryMax"></label>
            </div>
            <label class="mt-3 grid gap-1 text-xs text-slate-600">Currency<input class="h-11 min-w-0 rounded-lg border border-slate-300 px-3 text-sm uppercase" name="currency" maxlength="3" [(ngModel)]="draft.currency" placeholder="THB"></label>
            <p class="mt-2 text-xs leading-5 text-slate-500">Matches overlapping advertised ranges in this currency. No currency conversion is applied.</p>
          </fieldset>
          <button type="submit" class="min-h-11 rounded-lg bg-blue-800 px-4 text-sm font-semibold text-white disabled:opacity-50" [disabled]="form.invalid || store.loading() || !!store.busy() || store.items().length>=20">{{ store.busy()==='create'?'Saving…':'Save search & enable alerts' }}</button>
        </form>
      </section>
      <section class="min-w-0 space-y-4" aria-label="Saved searches">
        <div class="flex items-center justify-between gap-3"><h2 class="text-lg font-bold">Your searches <span class="text-sm font-normal text-slate-500">{{ store.items().length }}/20</span></h2><button class="min-h-11 px-3 text-sm font-semibold text-blue-800" [disabled]="store.loading() || !!store.busy()" (click)="store.load()">Refresh</button></div>
        @if(store.notice()){<p role="status" class="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{{store.notice()}}</p>}
        @if(store.actionError()){<p role="alert" class="rounded-lg bg-red-50 p-4 text-sm text-red-800">{{store.actionError()}}</p>}
        @if(store.loading()){<p role="status" class="card-surface p-8 text-center text-slate-500">Loading saved searches…</p>}
        @else if(store.error()){<div role="alert" class="card-surface p-6 text-red-800">{{store.error()}} <button class="min-h-11 underline" (click)="store.load()">Try again</button></div>}
        @else {
          @for(item of store.items();track item.id){
            <article class="card-surface min-w-0 p-5 sm:p-6">
              <div class="flex flex-wrap items-start justify-between gap-3"><h3 class="min-w-0 max-w-full break-words text-base font-bold">{{item.name}}</h3><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold" [class.text-emerald-800]="item.enabled">{{item.enabled?'Alerts on':'Paused'}}</span></div>
              <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                @if(item.query){<span class="max-w-full break-words rounded-md bg-slate-50 px-3 py-2">Keyword: {{item.query}}</span>}
                @if(item.location){<span class="max-w-full break-words rounded-md bg-slate-50 px-3 py-2">Location: {{item.location}}</span>}
                @if(item.salaryMin!==null || item.salaryMax!==null){<span class="rounded-md bg-slate-50 px-3 py-2">{{{min:item.salaryMin,max:item.salaryMax,currency:item.currency}|salaryRange}}</span>}
              </div>
              <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <button class="min-h-11 text-sm font-semibold text-blue-800 underline underline-offset-4" (click)="store.matches(item)">View matches<span class="sr-only">: {{item.name}}</span></button>
                <button class="min-h-11 text-sm font-semibold text-slate-600 disabled:opacity-50" [disabled]="!!store.busy()" (click)="store.toggle(item)">{{item.enabled?'Pause alerts':'Resume alerts'}}<span class="sr-only">: {{item.name}}</span></button>
                <button class="min-h-11 text-sm font-semibold text-red-700" [disabled]="!!store.busy()" (click)="confirmDelete.set(item.id)">Delete<span class="sr-only">: {{item.name}}</span></button>
              </div>
              @if(confirmDelete()===item.id){<div class="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm"><p>Delete this search? Existing notifications will be kept.</p><div class="mt-2 flex gap-4"><button class="min-h-11 font-semibold text-red-800" [disabled]="!!store.busy()" (click)="store.remove(item);confirmDelete.set('')">Confirm delete</button><button class="min-h-11 text-slate-600" (click)="confirmDelete.set('')">Keep search</button></div></div>}
            </article>
          } @empty {<div class="card-surface px-6 py-12 text-center"><h3 class="text-lg font-bold">Your next opportunity starts here</h3><p class="mt-2 text-sm leading-6 text-slate-500">Create your first saved search to collect relevant opportunities and receive alerts in your notification inbox.</p></div>}
        }
        <p class="text-xs leading-5 text-slate-500">Alerts cover future first publications. Pausing or resuming does not send older jobs. Matching several searches still produces one alert per job.</p>
      </section>
    </div>
    @if(store.selected();as selected){
      <section class="mt-8 border-t border-slate-200 pt-7" aria-label="Matching jobs">
        <h2 class="break-words text-xl font-bold">Matches for {{selected.name}}</h2><p class="mt-2 text-sm text-slate-500">Currently active opportunities, including jobs published before you saved this search.</p>
        @if(store.resultsLoading()){<p role="status" class="py-8">Loading matching jobs…</p>}
        @else if(store.resultsError()){<div role="alert" class="mt-4 rounded-lg bg-red-50 p-4 text-red-800">{{store.resultsError()}} <button class="min-h-11 underline" (click)="store.matches(selected,store.page())">Retry matches</button></div>}
        @else {<p class="mt-4 text-xs text-slate-500">{{store.total()}} matches</p><div class="mt-3 grid gap-4 md:grid-cols-2">
          @for(job of store.jobs();track job.id){<article class="card-surface min-w-0 p-5"><h3 class="break-words font-bold"><a [routerLink]="['/jobs',job.id]" class="text-blue-800 underline">{{job.title}}</a></h3><p class="mt-2 text-sm text-slate-600">{{job.companyName}} @if(job.companyName && job.location){ · } {{job.location}}</p><p class="mt-2 text-sm">{{{min:job.salaryMin,max:job.salaryMax,currency:job.salaryCurrency||'THB'}|salaryRange}}</p></article>}
          @empty {<p class="card-surface p-8 text-sm text-slate-500 md:col-span-2">No active matches yet. Your saved criteria are ready for future opportunities.</p>}
        </div><div class="mt-5"><app-pagination [page]="store.page()" [totalPages]="store.totalPages()" (pageChange)="store.matches(selected,$event)" /></div>}
      </section>
    }
  </main>`,
})
export class SavedSearchesComponent implements OnInit {
  protected readonly store=inject(SavedSearchesStore);
  protected readonly confirmDelete=signal('');
  private readonly route=inject(ActivatedRoute);
  protected draft:SavedSearchInput={name:'',query:this.route.snapshot.queryParamMap.get('q')??'',location:this.route.snapshot.queryParamMap.get('location')??'',salaryMin:null,salaryMax:null,currency:'THB'};
  ngOnInit():void{void this.store.load();}
  protected async save():Promise<void>{if(await this.store.create(this.draft))this.draft={name:'',query:'',location:'',salaryMin:null,salaryMax:null,currency:'THB'};}
}
