import { Routes } from '@angular/router';
import { roleGuard, authenticatedGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'notifications', canActivate: [authenticatedGuard], loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'jobs',
    loadChildren: () => import('./features/jobs/jobs.routes').then((m) => m.jobsRoutes),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'job-seeker',
    canActivate: [roleGuard('ROLE_JOB_SEEKER')],
    loadChildren: () => import('./features/job-seeker/job-seeker.routes').then((m) => m.jobSeekerRoutes),
  },
  {
    path: 'employer',
    canActivate: [roleGuard('ROLE_EMPLOYER')],
    loadChildren: () => import('./features/employer/employer.routes').then((m) => m.employerRoutes),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('ROLE_ADMIN')],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
