import { Routes } from '@angular/router';

export const clienteRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cliente-listar/cliente-listar').then(
        (m) => m.ClienteListarComponent
      ),
  },
];
