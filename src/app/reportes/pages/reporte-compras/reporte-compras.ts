import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CompraService } from '../../../compra/services/compra.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Compra } from '../../../compra/interfaces/compra.interface';

@Component({
  selector: 'app-reporte-compras',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-compras.html',
  styleUrls: ['./reporte-compras.css'],
})
export class ReporteComprasComponent implements OnInit {
  private compraService = inject(CompraService);
  private authService   = inject(AuthService);

  cargando = true;
  compras: Compra[] = [];

  filtroInsumo      = '';
  filtroFechaInicio = '';
  filtroFechaFin    = '';
  filtroValorMin    = '';
  filtroValorMax    = '';
  filtroActivo      = '';

  ngOnInit(): void {
    const restauranteId = this.authService.getRestauranteId();
    const src$ = restauranteId
      ? this.compraService.obtenerPorRestaurante(restauranteId)
      : this.compraService.obtenerTodas();

    src$.subscribe({
      next: (data) => { this.compras = data; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

  get comprasFiltradas(): Compra[] {
    let r = [...this.compras];

    if (this.filtroInsumo) {
      const q = this.filtroInsumo.toLowerCase();
      r = r.filter(c =>
        c.insumo?.descripcion?.toLowerCase().includes(q) ||
        c.insumo?.codigo?.toLowerCase().includes(q)
      );
    }
    if (this.filtroFechaInicio) {
      const d = new Date(this.filtroFechaInicio);
      r = r.filter(c => c.fechaCreacion && new Date(c.fechaCreacion) >= d);
    }
    if (this.filtroFechaFin) {
      const d = new Date(this.filtroFechaFin);
      d.setHours(23, 59, 59, 999);
      r = r.filter(c => c.fechaCreacion && new Date(c.fechaCreacion) <= d);
    }
    if (this.filtroValorMin !== '')
      r = r.filter(c => (c.valorTotal ?? 0) >= +this.filtroValorMin);
    if (this.filtroValorMax !== '')
      r = r.filter(c => (c.valorTotal ?? 0) <= +this.filtroValorMax);
    if (this.filtroActivo !== '')
      r = r.filter(c => String(c.activo) === this.filtroActivo);

    return r.sort((a, b) => {
      const da = a.fechaCreacion ? +new Date(a.fechaCreacion) : 0;
      const db = b.fechaCreacion ? +new Date(b.fechaCreacion) : 0;
      return db - da;
    });
  }

  get totalGastado(): number {
    return this.comprasFiltradas
      .filter(c => c.activo !== false)
      .reduce((s, c) => s + (c.valorTotal ?? 0), 0);
  }
  get contActivas(): number { return this.comprasFiltradas.filter(c => c.activo !== false).length; }
  get contAnuladas(): number { return this.comprasFiltradas.filter(c => c.activo === false).length; }

  get insumos(): string[] {
    return [...new Set(
      this.compras.map(c => c.insumo?.descripcion).filter(Boolean) as string[]
    )].sort();
  }

  limpiarFiltros(): void {
    this.filtroInsumo = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroValorMin = '';
    this.filtroValorMax = '';
    this.filtroActivo = '';
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  }

  fmtFecha(s?: string): string {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }
}
