import { Routes } from '@angular/router';

export const pedidoRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'registrar',
        loadComponent: () =>
          import('./pages/pedido-registrar/pedido-registrar').then(
            (m) => m.PedidoRegistrarPageComponent
          ),
      },
      {
        path: 'listar',
        loadComponent: () =>
          import('./pages/pedido-listar/pedido-listar').then(
            (m) => m.PedidoListarPageComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'registrar',
      },
    ],
  },
];
