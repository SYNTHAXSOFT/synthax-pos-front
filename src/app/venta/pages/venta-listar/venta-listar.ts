import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VentaService } from '../../services/venta.service';
import { Venta } from '../../interfaces/venta.interface';
import { ESTADOS_VENTA } from '../../../utils/constantes-utils';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-venta-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './venta-listar.html',
})
export class VentaListarPageComponent implements OnInit {
  private readonly ventaService = inject(VentaService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  public ventas: Venta[] = [];
  public cargando: boolean = false;
  public estadoFiltro: string = '';
  public readonly estadosVenta = ESTADOS_VENTA;
  public restauranteId?: number;

  ngOnInit(): void {
    this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.cargando = true;
    const obs = this.estadoFiltro
      ? this.ventaService.obtenerPorEstado(this.estadoFiltro)
      : this.ventaService.obtenerTodos();

    obs.subscribe({
      next: (data) => {
        this.ventas = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.cargando = false;
      },
    });
  }

  filtrarPorEstado(estado: string): void {
    this.estadoFiltro = estado;
    this.cargarVentas();
  }

  verPedidos(ventaId?: number): void {
    if (!ventaId) return;
    this.router.navigate(['/synthax-pos/pedido/registrar'], { queryParams: { ventaId } });
  }

  anular(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea anular esta venta? Esta acción no se puede revertir.')) return;
    this.ventaService.anularVenta(id).subscribe({
      next: () => {
        alert('Venta anulada');
        this.cargarVentas();
      },
      error: (err) => {
        console.error('Error al anular:', err);
        alert('Error: ' + (err.error?.error || 'No se pudo anular la venta'));
      },
    });
  }

  cerrar(id?: number): void {
    if (!id) return;
    const totalStr = prompt('Ingrese el valor total de la venta:');
    if (totalStr === null) return;
    const total = parseFloat(totalStr);
    if (isNaN(total) || total < 0) {
      alert('Valor inválido');
      return;
    }
    this.ventaService.cerrarVenta(id, total).subscribe({
      next: () => {
        alert('Venta cerrada exitosamente');
        this.cargarVentas();
      },
      error: (err) => {
        console.error('Error al cerrar:', err);
        alert('Error: ' + (err.error?.error || 'No se pudo cerrar la venta'));
      },
    });
  }

  getBadgeClass(estado?: string): string {
    switch (estado) {
      case 'ABIERTA': return 'badge bg-success';
      case 'PAGADA':  return 'badge bg-primary';
      case 'ANULADA': return 'badge bg-danger';
      default:        return 'badge bg-secondary';
    }
  }
}
