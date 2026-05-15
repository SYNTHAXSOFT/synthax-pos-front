import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CajaService }    from '../../../caja/services/caja.service';
import { AuthService }    from '../../../auth/services/auth.service';
import { InsumoControlStockItem } from '../../../insumo/interfaces/insumo.interface';

@Component({
  selector: 'app-control-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control-stock.html',
  styleUrls: ['./control-stock.css'],
})
export class ControlStockComponent implements OnInit, OnDestroy {
  private readonly cajaService = inject(CajaService);
  private readonly authService = inject(AuthService);

  cargando    = true;
  sinSesion   = false;
  errorAcceso = false;   // 403/401 — sin permiso
  items: InsumoControlStockItem[] = [];
  filtroBusqueda = '';

  /** Actualización automática cada 60 s mientras la página esté abierta */
  private intervaloId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.cargar();
    this.intervaloId = setInterval(() => this.cargar(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.intervaloId) clearInterval(this.intervaloId);
  }

  cargar(): void {
    this.cargando    = true;
    this.sinSesion   = false;
    this.errorAcceso = false;
    this.cajaService.obtenerControlStock().subscribe({
      next: (data) => {
        this.items    = data;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        if (err.status === 403 || err.status === 401) {
          this.errorAcceso = true;
        } else {
          // 400 o cualquier otro error = sin sesión abierta
          this.sinSesion = true;
        }
      },
    });
  }

  get itemsFiltrados(): InsumoControlStockItem[] {
    if (!this.filtroBusqueda.trim()) return this.items;
    const q = this.filtroBusqueda.toLowerCase();
    return this.items.filter(i =>
      i.insumoDescripcion?.toLowerCase().includes(q) ||
      i.medida?.toLowerCase().includes(q)
    );
  }

  /** Clase de color para la columna Restante */
  stockClass(item: InsumoControlStockItem): string {
    const restante = item.stockFinal ?? 0;
    if (restante <= 0)  return 'spx-cs__badge--red';
    if (restante <= 5)  return 'spx-cs__badge--amber';
    return 'spx-cs__badge--green';
  }

  exportar(): void {
    window.print();
  }

  fmtNum(n?: number): string {
    if (n == null) return '0';
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  }

  get contSinStock(): number {
    return this.items.filter(i => (i.stockFinal ?? 0) <= 0).length;
  }

  get ahora(): Date { return new Date(); }
}
