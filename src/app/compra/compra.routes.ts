import { Routes } from '@angular/router';

export const compraRoutes: Routes = [
  {
    path: 'registrar',
    title: 'Registrar Compra',
    loadComponent: () =>
      import('./pages/compra-registrar/compra-registrar').then(
        (m) => m.CompraRegistrarPageComponent
      ),
  },
  {
    path: 'listar',
    title: 'Lista de Compras',
    loadComponent: () =>
      import('./pages/compra-listar/compra-listar').then(
        (m) => m.CompraListarPageComponent
      ),
  },
  { path: '**', redirectTo: 'registrar' },
];
