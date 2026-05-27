import { Routes } from '@angular/router';

export const categoriaProductoRoutes: Routes = [
  {
    path: '',
    title: 'Categorías de Producto',
    loadComponent: () =>
      import('./pages/categoria-producto-page/categoria-producto-page').then(
        (m) => m.CategoriaProductoPageComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
