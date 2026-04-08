import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InsumoService } from '../../../insumo/services/insumo.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Insumo } from '../../../insumo/interfaces/insumo.interface';

@Component({
  selector: 'app-reporte-inventario',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-inventario.html',
  styleUrls: ['./reporte-inventario.css'],
})
export class ReporteInventarioComponent implements OnInit {
  private insumoService = inject(InsumoService);
  private authService   = inject(AuthService);

  cargando = true;
  insumos: Insumo[] = [];

  filtroBusqueda = '';
  filtroMedida   = '';
  filtroStockMin = '';
  filtroActivo   = '';

  readonly STOCK_BAJO = 5;

  ngOnInit(): void {
    const restauranteId = this.authService.getRestauranteId();
    const src$ = restauranteId
      ? this.insumoService.obtenerPorRestaurante(restauranteId)
      : this.insumoService.obtenerTodos();

    src$.subscribe({
      next: (data) => { this.insumos = data; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

  get insumosFiltrados(): Insumo[] {
    let r = [...this.insumos];

    if (this.filtroBusqueda) {
      const q = this.filtroBusqueda.toLowerCase();
      r = r.filter(i =>
        i.descripcion?.toLowerCase().includes(q) ||
        i.codigo?.toLowerCase().includes(q)
      );
    }
    if (this.filtroMedida)
      r = r.filter(i => i.medida === this.filtroMedida);

    if (this.filtroStockMin !== '')
      r = r.filter(i => (i.stock ?? 0) >= +this.filtroStockMin);

    if (this.filtroActivo !== '')
      r = r.filter(i => String(i.activo !== false) === this.filtroActivo);

    return r.sort((a, b) => (a.descripcion ?? '').localeCompare(b.descripcion ?? ''));
  }

  get contStockBajo(): number {
    return this.insumosFiltrados.filter(i => (i.stock ?? 0) < this.STOCK_BAJO && i.activo !== false).length;
  }
  get contSinStock(): number {
    return this.insumosFiltrados.filter(i => (i.stock ?? 0) === 0 && i.activo !== false).length;
  }
  get contActivos(): number {
    return this.insumosFiltrados.filter(i => i.activo !== false).length;
  }

  get medidas(): string[] {
    return [...new Set(this.insumos.map(i => i.medida).filter(Boolean) as string[])].sort();
  }

  stockClass(i: Insumo): string {
    const s = i.stock ?? 0;
    if (s === 0)           return 'spx-rpt__badge--red';
    if (s < this.STOCK_BAJO) return 'spx-rpt__badge--amber';
    return 'spx-rpt__badge--green';
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroMedida   = '';
    this.filtroStockMin = '';
    this.filtroActivo   = '';
  }

  fmtFecha(s?: string): string {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('es-CO', { dateStyle: 'short' });
  }
}
