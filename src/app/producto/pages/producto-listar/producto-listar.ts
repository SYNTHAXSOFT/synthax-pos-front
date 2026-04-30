import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../interfaces/producto.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-producto-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './producto-listar.html',
  styleUrls: ['./producto-listar.css'],
})
export class ProductoListarPageComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly toastService    = inject(ToastService);
  private readonly confirmService  = inject(ConfirmService);

  @Input() modoModal: boolean = false;
  @Output() nuevoProducto   = new EventEmitter<void>();
  @Output() editarProducto  = new EventEmitter<number>();
  @Output() duplicarProducto = new EventEmitter<number>();

  public productos: Producto[] = [];
  public cargando: boolean  = false;
  public errorCarga         = false;

  searchTerm: string = '';
  filtroEstado: 'todos' | 'activo' | 'inactivo' = 'todos';

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando   = true;
    this.errorCarga = false;
    this.productoService.obtenerTodos().pipe(timeout(30_000)).subscribe({
      next: (data) => { this.productos = data; this.cargando = false; },
      error: ()    => { this.cargando = false; this.errorCarga = true; },
    });
  }

  get productosFiltrados(): Producto[] {
    return this.productos.filter(p => {
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        (p.nombre?.toLowerCase().includes(term) ?? false) ||
        (p.codigo?.toLowerCase().includes(term) ?? false) ||
        (p.descripcion?.toLowerCase().includes(term) ?? false);
      const matchEstado =
        this.filtroEstado === 'todos'    ? true :
        this.filtroEstado === 'activo'   ? (p.activo === true) :
        this.filtroEstado === 'inactivo' ? (p.activo === false) : true;
      return matchSearch && matchEstado;
    });
  }

  get totalActivos(): number   { return this.productos.filter(p => p.activo).length; }
  get totalInactivos(): number { return this.productos.filter(p => !p.activo).length; }
  get precioPromedio(): number {
    const activos = this.productos.filter(p => p.activo);
    if (!activos.length) return 0;
    return activos.reduce((sum, p) => sum + (p.precio ?? 0), 0) / activos.length;
  }

  setFiltroEstado(f: 'todos' | 'activo' | 'inactivo'): void {
    this.filtroEstado = f;
  }

  editar(id?: number): void {
    if (!id) return;
    this.editarProducto.emit(id);
  }

  duplicar(id?: number): void {
    if (!id) return;
    this.duplicarProducto.emit(id);
  }

  async desactivar(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Desea desactivar este producto?', type: 'danger' });
    if (!ok) return;
    this.productoService.desactivar(id).subscribe({
      next: () => { this.toastService.success('Producto desactivado'); this.cargarProductos(); },
      error: (err) => { console.error('Error al desactivar:', err); this.toastService.error('Error al desactivar el producto'); },
    });
  }

  getInitials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }
}
