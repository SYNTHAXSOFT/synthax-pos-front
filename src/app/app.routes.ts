import { Routes } from '@angular/router';
import { HomePageComponent } from './shared/pages/home-page/home-page.component';
import { AuthGuard } from './auth/guards/auth.guard';
import { RoleGuard } from './auth/guards/role.guard';

export const routes: Routes = [
  { path: '', component: HomePageComponent },

  {
    // Ruta principal del dashboard POS
    // (renombrado de 'synthax-votos' a 'synthax-pos' para reflejar el dominio)
    path: 'synthax-pos',
    loadComponent: () =>
      import('./shared/pages/dashboard-page/dashboard-page.component'),
    canActivate: [AuthGuard],
    children: [

      // ── Inicio ──────────────────────────────────────────────────────────────
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio',
      },
      {
        path: 'inicio',
        title: 'Inicio',
        loadComponent: () =>
          import('./shared/pages/inicio-page/inicio-page.component').then(
            (m) => m.InicioPageComponent
          ),
      },

      // ── Administración ──────────────────────────────────────────────────────
      {
        path: 'usuario',
        title: 'Usuarios',
        loadChildren: () =>
          import('./usuario/usuario.routes').then((m) => m.usuarioRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR'] },
      },
      {
        path: 'departamento',
        title: 'Departamentos',
        loadChildren: () =>
          import('./departamento/departamento.routes').then((m) => m.departamentoRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT'] },
      },
      {
        path: 'municipio',
        title: 'Municipios',
        loadChildren: () =>
          import('./municipio/municipio.routes').then((m) => m.municipioRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT'] },
      },

      // ── Catálogos POS ───────────────────────────────────────────────────────
      {
        path: 'producto',
        title: 'Productos',
        loadChildren: () =>
          import('./producto/producto.routes').then((m) => m.productoRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR'] },
      },
      {
        path: 'mesa',
        title: 'Mesas',
        loadChildren: () =>
          import('./mesa/mesa.routes').then((m) => m.mesaRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR'] },
      },
      {
        path: 'tipo-pedido',
        title: 'Tipos de Pedido',
        loadChildren: () =>
          import('./tipo-pedido/tipo-pedido.routes').then((m) => m.tipoPedidoRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR'] },
      },
      {
        path: 'impuesto',
        title: 'Impuestos',
        loadChildren: () =>
          import('./impuesto/impuesto.routes').then((m) => m.impuestoRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR'] },
      },

      // ── Operación POS ───────────────────────────────────────────────────────
      {
        path: 'venta',
        title: 'Ventas',
        loadChildren: () =>
          import('./venta/venta.routes').then((m) => m.ventaRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR', 'CAJERO', 'MESERO'] },
      },
      {
        path: 'pedido',
        title: 'Pedidos',
        loadChildren: () =>
          import('./pedido/pedido.routes').then((m) => m.pedidoRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR', 'CAJERO', 'MESERO'] },
      },

      { path: '**', redirectTo: 'inicio' },
    ],
  },

  {
    path: 'auth',
    title: 'Auth',
    loadChildren: () => import('./auth/auth.routes'),
  },

  { path: '**', redirectTo: '' },
];
