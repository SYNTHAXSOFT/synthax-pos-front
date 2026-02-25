import { Routes } from '@angular/router';

export const departamentoRoutes: Routes = [


    {
      path: '',
      children:[
        {
          path: 'registrar',
          loadComponent: () => import('./pages/registrar-page/registrar-page').then(m => m.RegistrarPageComponent)
        },
        {
          path: 'listar',
          loadComponent: () => import('./pages/listar-page/listar-page').then(m => m.ListarPageComponent)
        },
        {
        path: 'actualizar/:id',
        loadComponent: () =>
          import('./pages/actualizar-page/actualizar-page').then(
            (m) => m.ActualizarDepartamentoPageComponent
          ),
        },
        {
          path: '**',
          redirectTo: 'registrar'
        }
      ]
    }
    
];