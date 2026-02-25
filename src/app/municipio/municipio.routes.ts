import { Routes } from '@angular/router';

export const municipioRoutes: Routes = [
  {
    path: 'registrar',
    loadComponent: () =>
      import('./pages/registrar-page/registrar-page').then(
        (m) => m.RegistrarMunicipioPageComponent
      ),
  },
  {
    path: 'listar',
    loadComponent: () =>
      import('./pages/listar-page/listar-page').then(
        (m) => m.ListarMunicipioPageComponent
      ),
  },
  {
    path: '',
    redirectTo: 'registrar',
    pathMatch: 'full',
  },
];
