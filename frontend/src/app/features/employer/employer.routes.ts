import { Routes } from '@angular/router';

export const employerRoutes: Routes = [
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.EmployerDashboardComponent) },
  { path: 'post-job', loadComponent: () => import('./post-job/post-job.component').then((m) => m.PostJobComponent) },
  { path: 'manage-jobs', loadComponent: () => import('./manage-jobs/manage-jobs.component').then((m) => m.ManageJobsComponent) },
  { path: 'applicants/:id', loadComponent: () => import('./applicants/applicants.component').then((m) => m.ApplicantsComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
