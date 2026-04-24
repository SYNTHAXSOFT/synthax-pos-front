import { Routes } from '@angular/router';
import { RoleGuard } from '../auth/guards/role.guard';

/** Roles que pueden ver reportes completos (todos los sub-módulos). */
const ADMIN_ROLES = ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR'];

export const reportesRoutes: Routes = [
  {
    path: 'ventas',
    title: 'Reporte de Ventas',
    loadComponent: () =>
      import('./pages/reporte-ventas/reporte-ventas').then(m => m.ReporteVentasComponent),
    canActivate: [RoleGuard],
    data: { roles: ADMIN_ROLES },
  },
  {
    path: 'compras',
    title: 'Reporte de Compras',
    loadComponent: () =>
      import('./pages/reporte-compras/reporte-compras').then(m => m.ReporteComprasComponent),
    canActivate: [RoleGuard],
    data: { roles: ADMIN_ROLES },
  },
  {
    path: 'logs',
    title: 'Logs del Sistema',
    loadComponent: () =>
      import('./pages/reporte-logs/reporte-logs').then(m => m.ReporteLogsComponent),
    canActivate: [RoleGuard],
    data: { roles: ADMIN_ROLES },
  },
  {
    path: 'cierres',
    title: 'Cierres de Caja',
    loadComponent: () =>
      import('./pages/reporte-cierres/reporte-cierres').then(m => m.ReporteCierresComponent),
    canActivate: [RoleGuard],
    data: { roles: ADMIN_ROLES },
  },
  {
    path: 'inventario',
    title: 'Reporte de Inventario',
    loadComponent: () =>
      import('./pages/reporte-inventario/reporte-inventario').then(m => m.ReporteInventarioComponent),
    canActivate: [RoleGuard],
    data: { roles: ADMIN_ROLES },
  },
  {
    // Accesible para todos los roles con acceso a /reporte (incluye CAJERO y MESERO)
    path: 'mesas',
    title: 'Estado de Mesas',
    loadComponent: () =>
      import('./pages/reporte-mesas/reporte-mesas').then(m => m.ReporteMesasComponent),
  },
  // CAJERO/MESERO llegan aquí directamente → mesas. Otros roles pueden navegar al sub-reporte deseado.
  { path: '**', redirectTo: 'mesas' },
];
