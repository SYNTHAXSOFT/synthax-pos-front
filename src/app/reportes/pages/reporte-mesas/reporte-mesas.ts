import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MesaService } from '../../../mesa/services/mesa.service';
import { VentaService } from '../../../venta/services/venta.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Mesa } from '../../../mesa/interfaces/mesa.interface';
import { Venta } from '../../../venta/interfaces/venta.interface';

export interface MesaConEstado {
  mesa:         Mesa;
  ocupada:      boolean;
  ventaAbierta: Venta | null;
}

@Component({
  selector: 'app-reporte-mesas',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-mesas.html',
  styleUrls: ['./reporte-mesas.css'],
})
export class ReporteMesasComponent implements OnInit {
  private mesaService  = inject(MesaService);
  private ventaService = inject(VentaService);
  private authService  = inject(AuthService);

  cargando   = true;
  ultimaActualizacion: Date | null = null;

  mesas:  Mesa[]  = [];
  ventas: Venta[] = [];

  filtroBusqueda = '';
  filtroEstado: 'todas' | 'ocupada' | 'disponible' = 'todas';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    forkJoin({
      mesas:  this.mesaService.obtenerActivos(),
      ventas: this.ventaService.obtenerAbiertas(),
    }).subscribe({
      next: ({ mesas, ventas }) => {
        this.mesas  = mesas;
        this.ventas = ventas;
        this.ultimaActualizacion = new Date();
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  /** Cruza cada mesa activa con las ventas abiertas */
  get mesasConEstado(): MesaConEstado[] {
    return this.mesas.map(mesa => {
      const ventaAbierta = this.ventas.find(
        v => v.mesa?.id === mesa.id && v.estado === 'ABIERTA'
      ) ?? null;
      return { mesa, ocupada: ventaAbierta !== null, ventaAbierta };
    });
  }

  get mesasFiltradas(): MesaConEstado[] {
    let r = this.mesasConEstado;

    if (this.filtroBusqueda) {
      const q = this.filtroBusqueda.toLowerCase();
      r = r.filter(m =>
        m.mesa.nombre?.toLowerCase().includes(q) ||
        m.mesa.codigo?.toLowerCase().includes(q)
      );
    }

    if (this.filtroEstado === 'ocupada')
      r = r.filter(m => m.ocupada);
    if (this.filtroEstado === 'disponible')
      r = r.filter(m => !m.ocupada);

    return r;
  }

  get totalOcupadas(): number  { return this.mesasConEstado.filter(m => m.ocupada).length; }
  get totalDisponibles(): number { return this.mesasConEstado.filter(m => !m.ocupada).length; }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroEstado   = 'todas';
  }

  fmt(n?: number): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
  }

  fmtHora(s?: string): string {
    if (!s) return '—';
    return new Date(s).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  getMesaNum(mesa: Mesa): string {
    const match = (mesa.nombre ?? mesa.codigo ?? '').match(/\d+/);
    return match ? match[0] : mesa.codigo?.slice(-2) ?? '?';
  }
}
