import { Routes } from '@angular/router';

export const ventaRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'registrar',
        loadComponent: () =>
          import('./pages/venta-registrar/venta-registrar').then(
            (m) => m.VentaRegistrarPageComponent
          ),
      },
      {
        path: 'listar',
        loadComponent: () =>
          import('./pages/venta-listar/venta-listar').then(
            (m) => m.VentaListarPageComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'registrar',
      },
    ],
  },
];
