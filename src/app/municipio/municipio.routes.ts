import { Routes } from '@angular/router';

export const municipioRoutes: Routes = [
  {
    path: 'registrar',
    loadComponent: () =>
      import('./pages/municipio-registrar/municipio-registrar').then(
        (m) => m.RegistrarMunicipioPageComponent
      ),
  },
  {
    path: 'listar',
    loadComponent: () =>
      import('./pages/municipio-listar/municipio-listar').then(
        (m) => m.ListarMunicipioPageComponent
      ),
  },
  {
    path: '',
    redirectTo: 'registrar',
    pathMatch: 'full',
  },
];
