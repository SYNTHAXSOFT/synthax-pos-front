import { Routes } from '@angular/router';

export const mesaRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'registrar',
        loadComponent: () =>
          import('./pages/mesa-registrar/mesa-registrar').then(
            (m) => m.MesaRegistrarPageComponent
          ),
      },
      {
        path: 'listar',
        loadComponent: () =>
          import('./pages/mesa-listar/mesa-listar').then(
            (m) => m.MesaListarPageComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'registrar',
      },
    ],
  },
];
