import { Routes } from '@angular/router';

export const departamentoRoutes: Routes = [


    {
      path: '',
      children:[
        {
          path: 'registrar',
          loadComponent: () => import('./pages/departamento-registrar/departamento-registrar').then(m => m.RegistrarPageComponent)
        },
        {
          path: 'listar',
          loadComponent: () => import('./pages/departamento-listar/departamento-listar').then(m => m.ListarPageComponent)
        },
        {
        path: 'actualizar/:id',
        loadComponent: () =>
          import('./pages/departamento-actualizar/departamento-actualizar').then(
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