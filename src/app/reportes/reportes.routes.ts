import { Routes } from '@angular/router';

export const reportesRoutes: Routes = [
  {
    path: 'ventas',
    title: 'Reporte de Ventas',
    loadComponent: () =>
      import('./pages/reporte-ventas/reporte-ventas').then(m => m.ReporteVentasComponent),
  },
  {
    path: 'compras',
    title: 'Reporte de Compras',
    loadComponent: () =>
      import('./pages/reporte-compras/reporte-compras').then(m => m.ReporteComprasComponent),
  },
  {
    path: 'logs',
    title: 'Logs del Sistema',
    loadComponent: () =>
      import('./pages/reporte-logs/reporte-logs').then(m => m.ReporteLogsComponent),
  },
  {
    path: 'cierres',
    title: 'Cierres de Caja',
    loadComponent: () =>
      import('./pages/reporte-cierres/reporte-cierres').then(m => m.ReporteCierresComponent),
  },
  {
    path: 'inventario',
    title: 'Reporte de Inventario',
    loadComponent: () =>
      import('./pages/reporte-inventario/reporte-inventario').then(m => m.ReporteInventarioComponent),
  },
  { path: '**', redirectTo: 'ventas' },
];
