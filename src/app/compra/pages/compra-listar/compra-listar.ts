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

  ngOnInit(): void {
    if (!this.restauranteId) {
      this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    }
    this.cargarCompras();
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
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        (c.codigo?.toLowerCase().includes(term) ?? false) ||
        (c.insumo?.descripcion?.toLowerCase().includes(term) ?? false) ||
        (c.insumo?.codigo?.toLowerCase().includes(term) ?? false);

      const matchEstado =
        this.filtroEstado === 'todos'  ? true :
        this.filtroEstado === 'activa' ? (c.activo === true) :
        this.filtroEstado === 'anulada'? (c.activo === false) : true;

      return matchSearch && matchEstado;
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
    const ok = await this.confirmService.confirm({ message: '¿Desea anular esta compra? El stock NO se revertirá automáticamente.', type: 'danger' });
    if (!ok) return;
    this.compraService.desactivar(id).subscribe({
      next: () => { this.toastService.success('Compra anulada'); this.cargarCompras(); },
      error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'No se pudo anular')),
    });
  }

  totalCompras(): number {
    return this.compras
      .filter(c => c.activo)
      .reduce((acc, c) => acc + (c.valorTotal ?? 0), 0);
  }
}
