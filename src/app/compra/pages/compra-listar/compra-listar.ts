import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompraService } from '../../services/compra.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Compra } from '../../interfaces/compra.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-compra-listar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './compra-listar.html',
  styleUrls: ['./compra-listar.css'],
})
export class CompraListarPageComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly authService   = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  @Input() restauranteId?: number;
  /** Cuando es true el botón "Nueva Compra" emite el evento en vez de navegar */
  @Input() modoModal: boolean = false;
  @Output() nuevaCompra = new EventEmitter<void>();

  public compras: Compra[] = [];
  public cargando: boolean = false;

  // Filters
  searchTerm: string = '';
  filtroEstado: 'todos' | 'activa' | 'anulada' = 'todos';

  /** Rango de fechas (YYYY-MM-DD) */
  public fechaDesde: string = '';
  public fechaHasta: string = '';

  ngOnInit(): void {
    if (!this.restauranteId) {
      this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    }
    // Por defecto: mostrar solo las compras de hoy
    const hoy = this.fechaHoy();
    this.fechaDesde = hoy;
    this.fechaHasta = hoy;
    this.cargarCompras();
  }

  private fechaHoy(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  limpiarFechas(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  cargarCompras(): void {
    this.cargando = true;
    const obs = this.restauranteId
      ? this.compraService.obtenerPorRestaurante(this.restauranteId)
      : this.compraService.obtenerTodas();

    obs.subscribe({
      next: (data) => { this.compras = data; this.cargando = false; },
      error: (err) => { console.error('Error al cargar compras:', err); this.cargando = false; },
    });
  }

  get comprasFiltradas(): Compra[] {
    return this.compras.filter(c => {
      // ── Filtro de texto ─────────────────────────────────
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        (c.codigo?.toLowerCase().includes(term) ?? false) ||
        (c.insumo?.descripcion?.toLowerCase().includes(term) ?? false) ||
        (c.insumo?.codigo?.toLowerCase().includes(term) ?? false);

      // ── Filtro de estado ────────────────────────────────
      const matchEstado =
        this.filtroEstado === 'todos'  ? true :
        this.filtroEstado === 'activa' ? (c.activo === true) :
        this.filtroEstado === 'anulada'? (c.activo === false) : true;

      // ── Filtro de fechas ────────────────────────────────
      let matchFecha = true;
      if (c.fechaCreacion) {
        const fecha = new Date(c.fechaCreacion);
        if (this.fechaDesde) {
          matchFecha = matchFecha && fecha >= new Date(this.fechaDesde + 'T00:00:00');
        }
        if (this.fechaHasta) {
          matchFecha = matchFecha && fecha <= new Date(this.fechaHasta + 'T23:59:59');
        }
      } else if (this.fechaDesde || this.fechaHasta) {
        matchFecha = false;
      }

      return matchSearch && matchEstado && matchFecha;
    });
  }

  get totalActivas(): number  { return this.compras.filter(c => c.activo).length; }
  get totalAnuladas(): number { return this.compras.filter(c => !c.activo).length; }
  get totalValor(): number {
    return this.compras
      .filter(c => c.activo)
      .reduce((acc, c) => acc + (c.valorTotal ?? 0), 0);
  }

  setFiltroEstado(f: 'todos' | 'activa' | 'anulada'): void {
    this.filtroEstado = f;
  }

  async desactivar(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({
      message: '¿Desea anular esta compra? Se revertirá el stock del insumo y se restaurará el saldo de la forma de pago.',
      type: 'danger'
    });
    if (!ok) return;
    this.compraService.anular(id).subscribe({
      next: () => { this.toastService.success('Compra anulada. Stock e importe revertidos correctamente.'); this.cargarCompras(); },
      error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'No se pudo anular')),
    });
  }

  totalCompras(): number {
    return this.compras
      .filter(c => c.activo)
      .reduce((acc, c) => acc + (c.valorTotal ?? 0), 0);
  }
}
