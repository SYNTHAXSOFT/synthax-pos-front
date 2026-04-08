import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsumoService } from '../../services/insumo.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Insumo } from '../../interfaces/insumo.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-insumo-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insumo-listar.html',
  styleUrls: ['./insumo-listar.css'],
})
export class InsumoListarPageComponent implements OnInit {
  private readonly insumoService  = inject(InsumoService);
  private readonly authService    = inject(AuthService);
  private readonly toastService   = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  @Input() restauranteId?: number;
  @Input() modoModal: boolean = false;
  @Output() nuevoInsumo  = new EventEmitter<void>();
  @Output() editarInsumo = new EventEmitter<number>();

  public insumos: Insumo[] = [];
  public cargando: boolean = false;

  searchTerm: string = '';
  filtroEstado: 'todos' | 'ok' | 'bajo' | 'sin' = 'todos';

  ngOnInit(): void {
    if (!this.restauranteId) {
      this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    }
    this.cargarInsumos();
  }

  cargarInsumos(): void {
    this.cargando = true;
    const obs = this.restauranteId
      ? this.insumoService.obtenerPorRestaurante(this.restauranteId)
      : this.insumoService.obtenerTodos();

    obs.subscribe({
      next: (data) => { this.insumos = data; this.cargando = false; },
      error: (err) => { console.error('Error al cargar insumos:', err); this.cargando = false; },
    });
  }

  get insumosFiltrados(): Insumo[] {
    return this.insumos.filter(i => {
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        (i.descripcion?.toLowerCase().includes(term) ?? false) ||
        (i.codigo?.toLowerCase().includes(term) ?? false) ||
        (i.medida?.toLowerCase().includes(term) ?? false);

      const stock = i.stock ?? 0;
      const matchEstado =
        this.filtroEstado === 'todos' ? true :
        this.filtroEstado === 'ok'   ? stock > 5 :
        this.filtroEstado === 'bajo' ? (stock > 0 && stock <= 5) :
        this.filtroEstado === 'sin'  ? stock === 0 : true;

      return matchSearch && matchEstado;
    });
  }

  get totalActivos(): number    { return this.insumos.filter(i => i.activo).length; }
  get totalBajoStock(): number  { return this.insumos.filter(i => (i.stock ?? 0) > 0 && (i.stock ?? 0) <= 5).length; }
  get totalSinStock(): number   { return this.insumos.filter(i => (i.stock ?? 0) === 0).length; }

  setFiltroEstado(f: 'todos' | 'ok' | 'bajo' | 'sin'): void {
    this.filtroEstado = f;
  }

  editar(id?: number): void {
    if (!id) return;
    this.editarInsumo.emit(id);
  }

  async desactivar(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Desea desactivar este insumo?', type: 'danger' });
    if (!ok) return;
    this.insumoService.desactivar(id).subscribe({
      next: () => { this.toastService.success('Insumo desactivado'); this.cargarInsumos(); },
      error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'No se pudo desactivar')),
    });
  }

  getStockLabel(stock?: number): string {
    if (stock == null || stock === 0) return 'Sin Stock';
    if (stock <= 5) return 'Bajo Stock';
    return 'En Stock';
  }

  getStockClass(stock?: number): string {
    if (stock == null || stock === 0) return 'spx-inv-stock--out';
    if (stock <= 5) return 'spx-inv-stock--low';
    return 'spx-inv-stock--ok';
  }

  getBadgeClass(stock?: number): string {
    if (stock == null || stock === 0) return 'spx-inv-badge--out';
    if (stock <= 5) return 'spx-inv-badge--low';
    return '';
  }

  getMedidaIcon(medida?: string): string {
    if (!medida) return 'fa-solid fa-box';
    const m = medida.toLowerCase();
    if (m === 'kg' || m === 'g' || m === 'gr') return 'fa-solid fa-weight-hanging';
    if (m === 'l' || m === 'lt' || m === 'ml') return 'fa-solid fa-flask';
    if (m === 'unidad' || m === 'und' || m === 'u') return 'fa-solid fa-cube';
    if (m === 'porción' || m === 'porcion') return 'fa-solid fa-utensils';
    if (m === 'doc' || m === 'docena') return 'fa-solid fa-layer-group';
    return 'fa-solid fa-box-open';
  }
}
