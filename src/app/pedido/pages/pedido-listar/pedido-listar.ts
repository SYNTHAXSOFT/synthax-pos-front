import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../services/pedido.service';
import { Pedido } from '../../interfaces/pedido.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-pedido-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pedido-listar.html',
  styleUrls: ['./pedido-listar.css'],
})
export class PedidoListarPageComponent implements OnInit, OnChanges {
  private readonly pedidoService = inject(PedidoService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

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
      next: (data) => { this.pedidos = data; this.cargando = false; },
      error: (err) => { console.error('Error al cargar pedidos:', err); this.cargando = false; },
    });
  }

  async cancelarItem(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Desea cancelar este ítem del pedido?', type: 'danger' });
    if (!ok) return;
    this.pedidoService.cancelarItem(id).subscribe({
      next: () => { this.toastService.success('Ítem cancelado'); this.cargarPedidos(); },
      error: (err) => { this.toastService.error('Error: ' + (err.error?.error || 'No se pudo cancelar el ítem')); },
    });
  }

  subtotal(pedido: Pedido): number {
    return (pedido.cantidad ?? 0) * (pedido.producto?.precio ?? 0);
  }

  totalGeneral(): number {
    return this.pedidos
      .filter(p => p.activo)
      .reduce((acc, p) => acc + this.subtotal(p), 0);
  }

  get totalItems(): number     { return this.pedidos.length; }
  get itemsActivos(): number   { return this.pedidos.filter(p => p.activo).length; }
  get itemsCancelados(): number { return this.pedidos.filter(p => !p.activo).length; }
}
