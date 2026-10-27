import { Routes } from '@angular/router';

export const jobSeekerRoutes: Routes = [
  { path: 'resumes', loadComponent: () => import('./resumes/resumes.component').then(m => m.ResumesComponent) },
  { path: 'saved-searches', loadComponent: () => import('./saved-searches/saved-searches.component').then(m=>m.SavedSearchesComponent) },
  { path: 'interviews', loadComponent: () => import('../interviews/interviews.component').then(m => m.InterviewsComponent) },
  {
    path: 'saved-jobs',
    loadComponent: () => import('./saved-jobs/saved-jobs.component').then((m) => m.SavedJobsComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'my-applications',
    loadComponent: () => import('./my-applications/my-applications.component').then((m) => m.MyApplicationsComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then((m) => m.JobSeekerSettingsComponent),
  },
  {
    path: '',
    redirectTo: 'profile',
    pathMatch: 'full',
  },
];
