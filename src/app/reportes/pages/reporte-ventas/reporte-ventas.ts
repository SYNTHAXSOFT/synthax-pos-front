import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../../venta/services/venta.service';
import { Venta } from '../../../venta/interfaces/venta.interface';

@Component({
  selector: 'app-reporte-ventas',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-ventas.html',
  styleUrls: ['./reporte-ventas.css'],
})
export class ReporteVentasComponent implements OnInit {
  private ventaService = inject(VentaService);

  cargando = true;
  ventas: Venta[] = [];

  filtroEstado      = '';
  filtroFechaInicio = '';
  filtroFechaFin    = '';
  filtroMesa        = '';
  filtroTipoPedido  = '';
  filtroCliente     = '';
  filtroUsuario     = '';

  ngOnInit(): void {
    this.ventaService.obtenerTodos().subscribe({
      next: (data) => { this.ventas = data; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

  get ventasFiltradas(): Venta[] {
    let r = [...this.ventas];

    if (this.filtroEstado)
      r = r.filter(v => v.estado === this.filtroEstado);

    if (this.filtroFechaInicio) {
      const d = new Date(this.filtroFechaInicio + 'T00:00:00');
      r = r.filter(v => v.fechaCreacion && new Date(v.fechaCreacion) >= d);
    }
    if (this.filtroFechaFin) {
      const d = new Date(this.filtroFechaFin + 'T00:00:00');
      d.setHours(23, 59, 59, 999);
      r = r.filter(v => v.fechaCreacion && new Date(v.fechaCreacion) <= d);
    }
    if (this.filtroMesa)
      r = r.filter(v => v.mesa?.nombre === this.filtroMesa);

    if (this.filtroTipoPedido)
      r = r.filter(v => v.tipoPedido?.nombre === this.filtroTipoPedido);

    if (this.filtroCliente) {
      const q = this.filtroCliente.toLowerCase();
      r = r.filter(v => this.clienteNombre(v).toLowerCase().includes(q));
    }
    if (this.filtroUsuario) {
      const q = this.filtroUsuario.toLowerCase();
      r = r.filter(v => {
        const u = v.usuarioCreador;
        return u ? `${u.nombre ?? ''} ${u.apellido ?? ''}`.toLowerCase().includes(q) : false;
      });
    }

    return r.sort((a, b) => {
      const da = a.fechaCreacion ? +new Date(a.fechaCreacion) : 0;
      const db = b.fechaCreacion ? +new Date(b.fechaCreacion) : 0;
      return db - da;
    });
  }

  get totalIngresos(): number {
    return this.ventasFiltradas
      .filter(v => v.estado === 'PAGADA')
      .reduce((s, v) => s + (v.valorTotal ?? 0), 0);
  }
  get contPagadas(): number { return this.ventasFiltradas.filter(v => v.estado === 'PAGADA').length; }
  get contAbiertas(): number { return this.ventasFiltradas.filter(v => v.estado === 'ABIERTA').length; }
  get contAnuladas(): number { return this.ventasFiltradas.filter(v => v.estado === 'ANULADA').length; }

  get mesas(): string[] {
    return [...new Set(this.ventas.map(v => v.mesa?.nombre).filter(Boolean) as string[])].sort();
  }
  get tiposPedido(): string[] {
    return [...new Set(this.ventas.map(v => v.tipoPedido?.nombre).filter(Boolean) as string[])].sort();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroMesa = '';
    this.filtroTipoPedido = '';
    this.filtroCliente = '';
    this.filtroUsuario = '';
  }

  clienteNombre(v: Venta): string {
    if (v.cliente)
      return `${v.cliente.nombre ?? ''} ${v.cliente.apellido ?? ''}`.trim() || '—';
    if (v.usuarioCliente)
      return `${v.usuarioCliente.nombre ?? ''} ${v.usuarioCliente.apellido ?? ''}`.trim() || '—';
    return 'Consumidor Final';
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  }

  fmtFecha(s?: string): string {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  // ── Lightbox de imagen de soporte ────────────────────────────────────────
  ventaImagenActiva: Venta | null = null;

  verImagen(v: Venta): void {
    this.ventaImagenActiva = v;
  }

  cerrarImagen(): void {
    this.ventaImagenActiva = null;
  }

  descargarImagen(v: Venta): void {
    if (!v.imagenSoporte) return;
    const a = document.createElement('a');
    a.href     = v.imagenSoporte;
    a.download = `soporte-venta-${v.id}.jpg`;
    a.click();
  }
}
