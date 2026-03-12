import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../interfaces/producto.interface';

@Component({
  selector: 'app-producto-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto-listar.html',
})
export class ProductoListarPageComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);

  public productos: Producto[] = [];
  public cargando: boolean = false;

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

  desactivar(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea desactivar este producto?')) return;
    this.productoService.desactivar(id).subscribe({
      next: () => {
        alert('Producto desactivado');
        this.cargarProductos();
      },
      error: (err) => {
        console.error('Error al desactivar:', err);
        alert('Error al desactivar el producto');
      },
    });
  }

  editar(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/producto/registrar'], {
      queryParams: { id },
    });
  }
}
