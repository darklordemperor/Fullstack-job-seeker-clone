import { Routes } from '@angular/router';

export const jobSeekerRoutes: Routes = [
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
