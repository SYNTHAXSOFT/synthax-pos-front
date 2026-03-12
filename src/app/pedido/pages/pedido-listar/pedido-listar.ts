import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../services/pedido.service';
import { Pedido } from '../../interfaces/pedido.interface';

@Component({
  selector: 'app-pedido-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pedido-listar.html',
})
export class PedidoListarPageComponent implements OnInit, OnChanges {
  private readonly pedidoService = inject(PedidoService);

  /** Si se provee ventaId, se muestran solo los ítems de esa venta */
  @Input() ventaId?: number;

  public pedidos: Pedido[] = [];
  public cargando: boolean = false;

  ngOnInit(): void {
    this.cargarPedidos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ventaId']) {
      this.cargarPedidos();
    }
  }

  cargarPedidos(): void {
    this.cargando = true;
    const obs = this.ventaId
      ? this.pedidoService.obtenerActivosPorVenta(this.ventaId)
      : this.pedidoService.obtenerTodos();

    obs.subscribe({
      next: (data) => {
        this.pedidos = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar pedidos:', err);
        this.cargando = false;
      },
    });
  }

  cancelarItem(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea cancelar este ítem del pedido?')) return;
    this.pedidoService.cancelarItem(id).subscribe({
      next: () => {
        alert('Ítem cancelado');
        this.cargarPedidos();
      },
      error: (err) => {
        console.error('Error al cancelar ítem:', err);
        alert('Error: ' + (err.error?.error || 'No se pudo cancelar el ítem'));
      },
    });
  }

  /** Calcula el subtotal de un pedido */
  subtotal(pedido: Pedido): number {
    return (pedido.cantidad ?? 0) * (pedido.producto?.precio ?? 0);
  }

  /** Calcula el total general de los pedidos activos */
  totalGeneral(): number {
    return this.pedidos
      .filter((p) => p.activo)
      .reduce((acc, p) => acc + this.subtotal(p), 0);
  }
}
