import { Routes } from '@angular/router';

export const formaPagoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/forma-pago-listar/forma-pago-listar').then(
        (m) => m.FormaPagoListarComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
