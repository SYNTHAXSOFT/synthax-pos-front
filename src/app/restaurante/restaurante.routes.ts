import { Routes } from '@angular/router';

export const restauranteRoutes: Routes = [
  {
    path: 'registrar',
    title: 'Registrar Restaurante',
    loadComponent: () =>
      import('./pages/restaurante-registrar/restaurante-registrar').then(
        (m) => m.RestauranteRegistrarPageComponent
      ),
  },
  {
    path: 'listar',
    title: 'Lista de Restaurantes',
    loadComponent: () =>
      import('./pages/restaurante-listar/restaurante-listar').then(
        (m) => m.RestauranteListarPageComponent
      ),
  },
  {
    path: 'branding',
    title: 'Identidad Visual',
    loadComponent: () =>
      import('./pages/restaurante-branding/restaurante-branding').then(
        (m) => m.RestauranteBrandingComponent
      ),
  },
  { path: '**', redirectTo: 'registrar' },
];
