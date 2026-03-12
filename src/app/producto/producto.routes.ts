import { Routes } from '@angular/router';

export const productoRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'registrar',
        loadComponent: () =>
          import('./pages/producto-registrar/producto-registrar').then(
            (m) => m.ProductoRegistrarPageComponent
          ),
      },
      {
        path: 'listar',
        loadComponent: () =>
          import('./pages/producto-listar/producto-listar').then(
            (m) => m.ProductoListarPageComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'registrar',
      },
    ],
  },
];
