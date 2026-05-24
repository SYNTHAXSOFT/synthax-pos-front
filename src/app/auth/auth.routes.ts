import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'forgot-password',
    title: 'Recuperar contraseña',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
  },
  {
    path: 'reset-password',
    title: 'Nueva contraseña',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: '**',
    redirectTo: '/auth/forgot-password',
  },
];

export default authRoutes;
