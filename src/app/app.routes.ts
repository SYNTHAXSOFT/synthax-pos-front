import { Routes } from '@angular/router';
import { HomePageComponent } from './shared/pages/home-page/home-page.component';
import { AuthGuard } from './auth/guards/auth.guard';
import { RoleGuard } from './auth/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
  },

  {
    path: 'synthax-votos',
    loadComponent: () =>
      import('./shared/pages/dashboard-page/dashboard-page.component'),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'inicio',
        title: 'Inicio',
        loadComponent: () =>
          import('./shared/pages/inicio-page/inicio-page.component').then(
            (m) => m.InicioPageComponent
          ),
      },

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio',
      },

      {
        path: 'usuario',
        title: 'Usuario',
        loadChildren: () =>
          import('./usuario/usuario.routes').then(
            (modulo) => modulo.usuarioRoutes
          ),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR', 'CANDIDATO'] },
      },

      {
        path: 'departamento',
        title: 'Departamento',
        loadChildren: () =>
          import('./departamento/departamento.routes').then(
            (m) => m.departamentoRoutes
          ),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT'] },
      },
      
      {
        path: 'municipio',
        title: 'Municipio',
        loadChildren: () =>
          import('./municipio/municipio.routes').then((m) => m.municipioRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT'] },
      },

      {
        path: '**',
        redirectTo: 'inicio',
      },
    ],
  },

  {
    path: 'auth',
    title: 'Auth',
    loadChildren: () => import('./auth/auth.routes'),
  },

  {
    path: '**',
    redirectTo: '',
  },
];
