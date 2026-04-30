import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';
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
  public cargando: boolean  = false;
  public errorCarga         = false;

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
    // Por defecto: mes actual para no traer todo el historial
    if (!this.fechaDesde) this.fechaDesde = this.inicioMesActual();
    this.cargarCompras();
  }

  private inicioMesActual(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
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
    this.cargando   = true;
    this.errorCarga = false;

    const fechaDesdeISO = this.fechaDesde ? `${this.fechaDesde}T00:00:00` : `${this.inicioMesActual()}T00:00:00`;

    const obs = (this.restauranteId
      ? this.compraService.obtenerDesde(this.restauranteId, fechaDesdeISO)
      : this.compraService.obtenerTodas()
    ).pipe(timeout(30_000));

    obs.subscribe({
      next: (data) => { this.compras = data; this.cargando = false; },
      error: ()    => { this.cargando = false; this.errorCarga = true; },
    });
  }

  buscar(): void {
    this.compras = [];
    this.cargarCompras();
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
    return this.comprasFiltradas
      .filter(c => c.activo)
      .reduce((acc, c) => acc + (c.valorTotal ?? 0), 0);
  }

  // ── Visor de soporte ──────────────────────────────────────────────

  public soporteViewing: string | null = null;
  public soporteViewingCodigo: string  = '';

  verSoporte(compra: Compra): void {
    if (!compra.imagenSoporte) return;
    this.soporteViewing      = compra.imagenSoporte;
    this.soporteViewingCodigo = compra.codigo ?? `#${compra.id}`;
    document.body.style.overflow = 'hidden';
  }

  cerrarSoporte(): void {
    this.soporteViewing = null;
    document.body.style.overflow = '';
  }

  descargarSoporte(compra: Compra): void {
    if (!compra.imagenSoporte) return;
    const base64 = compra.imagenSoporte;
    // Extraer extensión del tipo MIME (data:image/png;base64,...)
    const mimeMatch = base64.match(/data:(image\/\w+);base64,/);
    const ext       = mimeMatch ? mimeMatch[1].split('/')[1] : 'jpg';
    const link      = document.createElement('a');
    link.href       = base64;
    link.download   = `soporte-${compra.codigo ?? compra.id}.${ext}`;
    link.click();
  }
}
