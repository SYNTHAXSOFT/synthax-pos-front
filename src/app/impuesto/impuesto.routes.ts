import { Routes } from '@angular/router';

export const impuestoRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'registrar',
        loadComponent: () =>
          import('./pages/impuesto-registrar/impuesto-registrar').then(
            (m) => m.ImpuestoRegistrarPageComponent
          ),
      },
      {
        path: 'listar',
        loadComponent: () =>
          import('./pages/impuesto-listar/impuesto-listar').then(
            (m) => m.ImpuestoListarPageComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'registrar',
      },
    ],
  },
];
