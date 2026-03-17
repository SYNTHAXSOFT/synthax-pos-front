import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { VentaService } from '../../services/venta.service';
import { Venta } from '../../interfaces/venta.interface';
import { ESTADOS_VENTA } from '../../../utils/constantes-utils';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { PedidoService } from '../../../pedido/services/pedido.service';
import { ImpuestoService } from '../../../impuesto/services/impuesto.service';
import { Impuesto } from '../../../impuesto/interfaces/impuesto.interface';

@Component({
  selector: 'app-venta-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta-listar.html',
  styleUrls: ['./venta-listar.css'],
})
export class VentaListarPageComponent implements OnInit {
  private readonly ventaService    = inject(VentaService);
  private readonly pedidoService   = inject(PedidoService);
  private readonly impuestoService = inject(ImpuestoService);
  private readonly router          = inject(Router);
  private readonly authService     = inject(AuthService);
  private readonly toastService    = inject(ToastService);
  private readonly confirmService  = inject(ConfirmService);

  public ventas: Venta[]      = [];
  public cargando: boolean    = false;
  public estadoFiltro: string = '';
  public readonly estadosVenta = ESTADOS_VENTA;

  // ── Modal de cierre ───────────────────────────────────────────────────────
  public modalCerrar: boolean        = false;
  public ventaCierreId: number | null = null;
  public ventaCierreNumero: string | null = null;
  public cerrandoVenta: boolean      = false;
  public cargandoModalData: boolean  = false;

  // ── Subtotal e impuestos ──────────────────────────────────────────────────
  public subtotalCierre: number = 0;
  public impuestosDisponibles: Impuesto[] = [];
  public impuestosSeleccionados: Set<number> = new Set();

  // ── Totales calculados (getters) ──────────────────────────────────────────
  get totalImpuestosAplicados(): { impuesto: Impuesto; valor: number }[] {
    return this.impuestosDisponibles
      .filter(i => this.impuestosSeleccionados.has(i.id!))
      .map(i => ({
        impuesto: i,
        valor: Math.round(this.subtotalCierre * (i.porcentajeImpuesto / 100)),
      }));
  }

  get totalConImpuestos(): number {
    const sumaImpuestos = this.totalImpuestosAplicados.reduce((s, t) => s + t.valor, 0);
    return this.subtotalCierre + sumaImpuestos;
  }

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.cargando = true;
    const obs = this.estadoFiltro
      ? this.ventaService.obtenerPorEstado(this.estadoFiltro)
      : this.ventaService.obtenerTodos();

    obs.subscribe({
      next:  (data) => { this.ventas = data; this.cargando = false; },
      error: (err)  => { console.error('Error al cargar ventas:', err); this.cargando = false; },
    });
  }

  filtrarPorEstado(estado: string): void {
    this.estadoFiltro = estado;
    this.cargarVentas();
  }

  get totalAbiertas(): number { return this.ventas.filter(v => v.estado === 'ABIERTA').length; }
  get totalPagadas(): number  { return this.ventas.filter(v => v.estado === 'PAGADA').length; }
  get totalAnuladas(): number { return this.ventas.filter(v => v.estado === 'ANULADA').length; }
  get totalIngresos(): number {
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
    const ok = await this.confirmService.confirm({
      message: '¿Desea anular esta venta? Esta acción no se puede revertir.',
      type: 'danger',
    });
    if (!ok) return;
    this.ventaService.anularVenta(id).subscribe({
      next:  () => { this.toastService.success('Venta anulada'); this.cargarVentas(); },
      error: (err) => { this.toastService.error('Error: ' + (err.error?.error || 'No se pudo anular la venta')); },
    });
  }

  // ── Apertura del modal de cierre ──────────────────────────────────────────

  abrirModalCerrar(venta: Venta): void {
    this.ventaCierreId       = venta.id ?? null;
    this.ventaCierreNumero   = venta.codigo ?? `#${venta.id}`;
    this.subtotalCierre      = 0;
    this.impuestosDisponibles = [];
    this.impuestosSeleccionados = new Set();
    this.cargandoModalData   = true;
    this.modalCerrar         = true;

    // Cargar pedidos e impuestos en paralelo
    forkJoin({
      pedidos:   this.pedidoService.obtenerActivosPorVenta(venta.id!),
      impuestos: this.impuestoService.obtenerActivos(),
    }).subscribe({
      next: ({ pedidos, impuestos }) => {
        // Calcular subtotal: sum(cantidad × precio del producto)
        this.subtotalCierre = pedidos.reduce((sum, p) => {
          const precio   = p.producto?.precio  ?? 0;
          const cantidad = p.cantidad           ?? 0;
          return sum + precio * cantidad;
        }, 0);

        this.impuestosDisponibles = impuestos;
        this.cargandoModalData    = false;
      },
      error: (err) => {
        console.error('Error al cargar datos del modal:', err);
        this.toastService.error('Error al cargar los datos de la venta');
        this.cargandoModalData = false;
      },
    });
  }

  cerrarModal(): void {
    this.modalCerrar             = false;
    this.ventaCierreId           = null;
    this.ventaCierreNumero       = null;
    this.cerrandoVenta           = false;
    this.cargandoModalData       = false;
    this.subtotalCierre          = 0;
    this.impuestosDisponibles    = [];
    this.impuestosSeleccionados  = new Set();
  }

  toggleImpuesto(id: number): void {
    if (this.impuestosSeleccionados.has(id)) {
      this.impuestosSeleccionados.delete(id);
    } else {
      this.impuestosSeleccionados.add(id);
    }
    // Forzar detección de cambios en el Set
    this.impuestosSeleccionados = new Set(this.impuestosSeleccionados);
  }

  confirmarCierre(): void {
    if (!this.ventaCierreId) return;
    if (this.cargandoModalData) return;

    this.cerrandoVenta = true;
    const facturadorId = this.authService.getUserId() ?? undefined;

    this.ventaService.cerrarVenta(this.ventaCierreId, this.totalConImpuestos, facturadorId).subscribe({
      next: () => {
        this.toastService.success('Venta cerrada · Stock de insumos actualizado');
        this.cerrarModal();
        this.cargarVentas();
      },
      error: (err) => {
        this.cerrandoVenta = false;
        this.toastService.error('Error: ' + (err.error?.error || 'No se pudo cerrar la venta'));
      },
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
