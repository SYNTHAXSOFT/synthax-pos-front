import { Routes } from '@angular/router';
import { HomePageComponent } from './shared/pages/home-page/home-page.component';
import { DefaultRedirectComponent } from './shared/pages/default-redirect/default-redirect.component';
import { AuthGuard } from './auth/guards/auth.guard';
import { RoleGuard } from './auth/guards/role.guard';
import { CajaGuard } from './caja/guards/caja.guard';

/**
 * Rutas del sistema POS (alineadas con SecurityConfig.java):
 *
 *  Ruta              | Roles permitidos
 *  ------------------|------------------------------------------------------
 *  Usuarios          | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Restaurantes      | ROOT, ADMINISTRADOR   (PROPIETARIO NO puede listar/crear)
 *  Identidad Visual  | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Mesas             | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Productos         | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Tipos de Pedido   | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Impuestos         | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Insumos           | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Compras           | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Formas de Pago    | ROOT, PROPIETARIO, ADMINISTRADOR
 *  Ventas            | ROOT, PROPIETARIO, ADMINISTRADOR, CAJERO, MESERO, COCINERO
 *  Pedidos           | ROOT, PROPIETARIO, ADMINISTRADOR, CAJERO, MESERO, COCINERO, DOMICILIARIO
 *  Departamentos     | ROOT
 *  Municipios        | ROOT
 */
export const routes: Routes = [
  { path: '', component: HomePageComponent },

  {
    path: 'synthax-pos',
    loadComponent: () =>
      import('./shared/pages/dashboard-page/dashboard-page.component'),
    canActivate: [AuthGuard],
    children: [

      // ── Redirect inteligente: redirige según el rol del usuario ─────────────
      { path: '', pathMatch: 'full', component: DefaultRedirectComponent },
      {
        path: 'inicio',
        title: 'Inicio',
        loadComponent: () =>
          import('./shared/pages/inicio-page/inicio-page.component').then(
            (m) => m.InicioPageComponent
          ),
        // COCINERO no necesita el panel de control — su flujo empieza en Ventas
        data: { hideForRoles: ['ROOT', 'COCINERO'] },
      },

      // ── Administración (accesos rápidos a configuración) ─────────────────────
      {
        path: 'administracion',
        title: 'Administración',
        loadComponent: () =>
          import('./shared/pages/administracion-page/administracion-page.component').then(
            (m) => m.AdministracionPageComponent
          ),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['PROPIETARIO', 'ADMINISTRADOR'] },
      },

      // ── Administración de usuarios ───────────────────────────────────────────
      {
        path: 'usuario',
        title: 'Usuarios',
        loadChildren: () =>
          import('./usuario/usuario.routes').then((m) => m.usuarioRoutes),
        canActivate: [RoleGuard, CajaGuard],
        // PROPIETARIO puede gestionar el personal de su restaurante — oculto del menú (acceso desde Administración)
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideFromMenu: true },
      },

      // ── Geografía (solo ROOT) ────────────────────────────────────────────────
      {
        path: 'departamento',
        title: 'Departamentos',
        loadChildren: () =>
          import('./departamento/departamento.routes').then((m) => m.departamentoRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT'] },
      },
      {
        path: 'municipio',
        title: 'Municipios',
        loadChildren: () =>
          import('./municipio/municipio.routes').then((m) => m.municipioRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT'] },
      },

      // ── Multi-tenancy ───────────────────────────────────────────────────────
      {
        // PROPIETARIO no puede listar ni crear restaurantes.
        // Solo ROOT y ADMINISTRADOR tienen acceso al CRUD completo.
        path: 'restaurante',
        title: 'Restaurantes',
        loadChildren: () =>
          import('./restaurante/restaurante.routes').then((m) => m.restauranteRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'ADMINISTRADOR'] },
      },
      {
        // Acceso directo a la identidad visual (logo + colores).
        // PROPIETARIO entra SOLO por esta ruta — no ve el listado de restaurantes.
        path: 'identidad-visual',
        title: 'Identidad Visual',
        loadComponent: () =>
          import('./restaurante/pages/restaurante-branding/restaurante-branding').then(
            (m) => m.RestauranteBrandingComponent
          ),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideFromMenu: true },
      },
      {
        path: 'insumo',
        title: 'Insumos',
        loadChildren: () =>
          import('./insumo/insumo.routes').then((m) => m.insumoRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideForRoles: ['ROOT'] },
      },
      {
        path: 'compra',
        title: 'Compras',
        loadChildren: () =>
          import('./compra/compra.routes').then((m) => m.compraRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO'], hideForRoles: ['ROOT'] },
      },
      {
        path: 'forma-pago',
        title: 'Formas de Pago',
        loadChildren: () =>
          import('./forma-pago/forma-pago.routes').then((m) => m.formaPagoRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideFromMenu: true },
      },

      // ── Catálogos POS ────────────────────────────────────────────────────────
      {
        path: 'producto',
        title: 'Productos',
        loadChildren: () =>
          import('./producto/producto.routes').then((m) => m.productoRoutes),
        canActivate: [RoleGuard, CajaGuard],
        // PROPIETARIO gestiona el catálogo de su restaurante
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideForRoles: ['ROOT'] },
      },
      {
        path: 'mesa',
        title: 'Mesas',
        loadChildren: () =>
          import('./mesa/mesa.routes').then((m) => m.mesaRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideFromMenu: true },
      },
      {
        path: 'tipo-pedido',
        title: 'Tipos de Pedido',
        loadChildren: () =>
          import('./tipo-pedido/tipo-pedido.routes').then((m) => m.tipoPedidoRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideFromMenu: true },
      },
      {
        path: 'impuesto',
        title: 'Impuestos',
        loadChildren: () =>
          import('./impuesto/impuesto.routes').then((m) => m.impuestoRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideFromMenu: true },
      },

      // ── Reportes ─────────────────────────────────────────────────────────────
      {
        path: 'reporte',
        title: 'Reportes',
        loadChildren: () =>
          import('./reportes/reportes.routes').then((m) => m.reportesRoutes),
        canActivate: [RoleGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'], hideFromMenu: true },
      },

      // ── Clientes ─────────────────────────────────────────────────────────────
      {
        path: 'cliente',
        title: 'Clientes',
        loadChildren: () =>
          import('./cliente/cliente.routes').then((m) => m.clienteRoutes),
        canActivate: [RoleGuard, CajaGuard],
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO'], hideForRoles: ['ROOT'] },
      },

      // ── Operación POS ────────────────────────────────────────────────────────
      {
        path: 'venta',
        title: 'Ventas',
        loadChildren: () =>
          import('./venta/venta.routes').then((m) => m.ventaRoutes),
        canActivate: [RoleGuard, CajaGuard],
        // Roles operativos ven ventas del día (solo lectura para COCINERO/MESERO/DOMICILIARIO)
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO', 'COCINERO', 'DOMICILIARIO'], hideForRoles: ['ROOT'] },
      },
      {
        path: 'pedido',
        title: 'Pedidos',
        loadChildren: () =>
          import('./pedido/pedido.routes').then((m) => m.pedidoRoutes),
        canActivate: [RoleGuard, CajaGuard],
        // COCINERO puede ver los pedidos del día — oculto del menú (acceso solo desde ventas)
        data: { roles: ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO', 'COCINERO'], hideForRoles: ['ROOT'], hideFromMenu: true },
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
