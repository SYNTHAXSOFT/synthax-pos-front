import { Routes } from '@angular/router';

export const tipoPedidoRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'registrar',
        loadComponent: () =>
          import('./pages/tipo-pedido-registrar/tipo-pedido-registrar').then(
            (m) => m.TipoPedidoRegistrarPageComponent
          ),
      },
      {
        path: 'listar',
        loadComponent: () =>
          import('./pages/tipo-pedido-listar/tipo-pedido-listar').then(
            (m) => m.TipoPedidoListarPageComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'registrar',
      },
    ],
  },
];
