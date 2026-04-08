import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../../pedido/services/pedido.service';
import { LogCambioPedido } from '../../../pedido/interfaces/log-cambio-pedido.interface';

const ESTADOS_PEDIDO = [
  'CREADO', 'PEDIDO', 'PREPARANDO', 'PREPARADO',
  'ENTREGADO_CLIENTE', 'ENTREGADO_DOMICILIARIO',
  'DEVUELTO', 'CANCELADO', 'DESTRUIDO',
];

const ROLES_SISTEMA = ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO', 'COCINERO', 'DOMICILIARIO'];

@Component({
  selector: 'app-reporte-logs',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-logs.html',
  styleUrls: ['./reporte-logs.css'],
})
export class ReporteLogsComponent implements OnInit {
  private pedidoService = inject(PedidoService);

  cargando = true;
  logs: LogCambioPedido[] = [];
  estadosPedido = ESTADOS_PEDIDO;
  rolesSistema  = ROLES_SISTEMA;

  filtroFechaInicio  = '';
  filtroFechaFin     = '';
  filtroEstadoNuevo  = '';
  filtroEstadoAnterior = '';
  filtroRol          = '';
  filtroPedidoId     = '';
  filtroMotivo       = '';

  ngOnInit(): void {
    this.pedidoService.obtenerLogs().subscribe({
      next: (data) => { this.logs = data; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

  get logsFiltrados(): LogCambioPedido[] {
    let r = [...this.logs];

    if (this.filtroFechaInicio) {
      const d = new Date(this.filtroFechaInicio);
      r = r.filter(l => l.fechaCambio && new Date(l.fechaCambio) >= d);
    }
    if (this.filtroFechaFin) {
      const d = new Date(this.filtroFechaFin);
      d.setHours(23, 59, 59, 999);
      r = r.filter(l => l.fechaCambio && new Date(l.fechaCambio) <= d);
    }
    if (this.filtroEstadoNuevo)
      r = r.filter(l => l.estadoNuevo === this.filtroEstadoNuevo);
    if (this.filtroEstadoAnterior)
      r = r.filter(l => l.estadoAnterior === this.filtroEstadoAnterior);
    if (this.filtroRol)
      r = r.filter(l => l.rolUsuario === this.filtroRol);
    if (this.filtroPedidoId)
      r = r.filter(l => String(l.pedido?.id) === this.filtroPedidoId.trim());
    if (this.filtroMotivo) {
      const q = this.filtroMotivo.toLowerCase();
      r = r.filter(l => l.motivo?.toLowerCase().includes(q));
    }

    return r;
  }

  get contCancelados(): number {
    return this.logsFiltrados.filter(l => l.estadoNuevo === 'CANCELADO').length;
  }
  get contDestruidos(): number {
    return this.logsFiltrados.filter(l => l.estadoNuevo === 'DESTRUIDO').length;
  }

  badgeClass(estado?: string): string {
    switch (estado) {
      case 'CREADO':              return 'spx-rpt__badge--gray';
      case 'PEDIDO':              return 'spx-rpt__badge--blue';
      case 'PREPARANDO':         return 'spx-rpt__badge--amber';
      case 'PREPARADO':          return 'spx-rpt__badge--purple';
      case 'ENTREGADO_CLIENTE':
      case 'ENTREGADO_DOMICILIARIO': return 'spx-rpt__badge--green';
      case 'DEVUELTO':           return 'spx-rpt__badge--amber';
      case 'CANCELADO':          return 'spx-rpt__badge--red';
      case 'DESTRUIDO':          return 'spx-rpt__badge--red';
      default:                   return '';
    }
  }

  limpiarFiltros(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroEstadoNuevo = '';
    this.filtroEstadoAnterior = '';
    this.filtroRol = '';
    this.filtroPedidoId = '';
    this.filtroMotivo = '';
  }

  fmtFecha(s?: string): string {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }
}
