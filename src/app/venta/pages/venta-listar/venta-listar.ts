import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VentaService } from '../../services/venta.service';
import { Venta } from '../../interfaces/venta.interface';
import { ESTADOS_VENTA } from '../../../utils/constantes-utils';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-venta-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta-listar.html',
  styleUrls: ['./venta-listar.css'],
})
export class VentaListarPageComponent implements OnInit {
  private readonly ventaService = inject(VentaService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

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
      next: (data) => { this.ventas = data; this.cargando = false; },
      error: (err) => { console.error('Error al cargar ventas:', err); this.cargando = false; },
    });
  }

  filtrarPorEstado(estado: string): void {
    this.estadoFiltro = estado;
    this.cargarVentas();
  }

  get totalAbiertas(): number  { return this.ventas.filter(v => v.estado === 'ABIERTA').length; }
  get totalPagadas(): number   { return this.ventas.filter(v => v.estado === 'PAGADA').length; }
  get totalAnuladas(): number  { return this.ventas.filter(v => v.estado === 'ANULADA').length; }
  get totalIngresos(): number  {
    return this.ventas
      .filter(v => v.estado === 'PAGADA')
      .reduce((sum, v) => sum + (v.valorTotal ?? 0), 0);
  }

  verPedidos(ventaId?: number): void {
    if (!ventaId) return;
    this.router.navigate(['/synthax-pos/pedido/registrar'], { queryParams: { ventaId } });
  }

  async anular(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Desea anular esta venta? Esta acción no se puede revertir.', type: 'danger' });
    if (!ok) return;
    this.ventaService.anularVenta(id).subscribe({
      next: () => { this.toastService.success('Venta anulada'); this.cargarVentas(); },
      error: (err) => { this.toastService.error('Error: ' + (err.error?.error || 'No se pudo anular la venta')); },
    });
  }

  cerrar(id?: number): void {
    if (!id) return;
    const totalStr = prompt('Ingrese el valor total de la venta:');
    if (totalStr === null) return;
    const total = parseFloat(totalStr);
    if (isNaN(total) || total < 0) { this.toastService.warning('Valor inválido'); return; }
    this.ventaService.cerrarVenta(id, total).subscribe({
      next: () => { this.toastService.success('Venta cerrada exitosamente'); this.cargarVentas(); },
      error: (err) => { this.toastService.error('Error: ' + (err.error?.error || 'No se pudo cerrar la venta')); },
    });
  }

  getBadgeClass(estado?: string): string {
    switch (estado) {
      case 'ABIERTA': return 'spx-venta-badge spx-venta-badge--open';
      case 'PAGADA':  return 'spx-venta-badge spx-venta-badge--paid';
      case 'ANULADA': return 'spx-venta-badge spx-venta-badge--void';
      default:        return 'spx-venta-badge';
    }
  }
}
