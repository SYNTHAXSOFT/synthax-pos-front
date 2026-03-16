import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../interfaces/producto.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-producto-listar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './producto-listar.html',
  styleUrls: ['./producto-listar.css'],
})
export class ProductoListarPageComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  public productos: Producto[] = [];
  public cargando: boolean = false;

  // Filters
  searchTerm: string = '';
  filtroEstado: 'todos' | 'activo' | 'inactivo' = 'todos';

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.productoService.obtenerTodos().subscribe({
      next: (data) => {
        this.productos = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.cargando = false;
      },
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
    if (!this.productos.length) return 0;
    const activos = this.productos.filter(p => p.activo);
    if (!activos.length) return 0;
    return activos.reduce((sum, p) => sum + (p.precio ?? 0), 0) / activos.length;
  }

  setFiltroEstado(f: 'todos' | 'activo' | 'inactivo'): void {
    this.filtroEstado = f;
  }

  async desactivar(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Desea desactivar este producto?', type: 'danger' });
    if (!ok) return;
    this.productoService.desactivar(id).subscribe({
      next: () => {
        this.toastService.success('Producto desactivado');
        this.cargarProductos();
      },
      error: (err) => {
        console.error('Error al desactivar:', err);
        this.toastService.error('Error al desactivar el producto');
      },
    });
  }

  editar(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/producto/registrar'], { queryParams: { id } });
  }

  getInitials(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
