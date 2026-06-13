import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.AdminDashboardComponent) },
  { path: 'users', loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent) },
  { path: 'applications', loadComponent: () => import('./applications/applications.component').then((m) => m.AdminApplicationsComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
