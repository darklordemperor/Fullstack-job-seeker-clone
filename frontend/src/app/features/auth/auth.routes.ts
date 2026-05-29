import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register-job-seeker',
    loadComponent: () => import('./register-job-seeker/register-job-seeker.component').then((m) => m.RegisterJobSeekerComponent),
  },
  {
    path: 'register-employer',
    loadComponent: () => import('./register-employer/register-employer.component').then((m) => m.RegisterEmployerComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
