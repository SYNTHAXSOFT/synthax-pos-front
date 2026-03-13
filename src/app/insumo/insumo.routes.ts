import { Routes } from '@angular/router';

export const insumoRoutes: Routes = [
  {
    path: 'registrar',
    title: 'Registrar Insumo',
    loadComponent: () =>
      import('./pages/insumo-registrar/insumo-registrar').then(
        (m) => m.InsumoRegistrarPageComponent
      ),
  },
  {
    path: 'listar',
    title: 'Lista de Insumos',
    loadComponent: () =>
      import('./pages/insumo-listar/insumo-listar').then(
        (m) => m.InsumoListarPageComponent
      ),
  },
  { path: '**', redirectTo: 'registrar' },
];
