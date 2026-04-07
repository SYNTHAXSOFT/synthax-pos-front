import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { VentaService } from '../../../venta/services/venta.service';
import { CompraService } from '../../../compra/services/compra.service';
import { FormaPagoService } from '../../../forma-pago/services/forma-pago.service';
import { PedidoService } from '../../../pedido/services/pedido.service';
import { CajaService } from '../../../caja/services/caja.service';
import { Venta } from '../../../venta/interfaces/venta.interface';
import { Compra } from '../../../compra/interfaces/compra.interface';
import { FormaPago } from '../../../forma-pago/interfaces/forma-pago.interface';
import { Pedido } from '../../../pedido/interfaces/pedido.interface';
import { CajaSesion, CierreReporteDTO } from '../../../caja/interfaces/caja.interface';
import { AperturaCajaModalComponent } from '../../../caja/components/apertura-caja-modal/apertura-caja-modal.component';
import { CierreCajaModalComponent } from '../../../caja/components/cierre-caja-modal/cierre-caja-modal.component';

@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [CommonModule, RouterLink, AperturaCajaModalComponent, CierreCajaModalComponent],
  templateUrl: './inicio-page.component.html',
  styleUrls: ['./inicio-page.component.css']
})
export class InicioPageComponent implements OnInit {
  private authService       = inject(AuthService);
  private ventaService      = inject(VentaService);
  private compraService     = inject(CompraService);
  private formaPagoService  = inject(FormaPagoService);
  private pedidoService     = inject(PedidoService);
  private cajaService       = inject(CajaService);

  todayStr = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  public cargando      = true;
  public ventas:       Venta[]     = [];
  public compras:      Compra[]    = [];
  public formasPago:   FormaPago[] = [];
  public pedidos:      Pedido[]    = [];

  // ── Caja ──────────────────────────────────────────────────────────────────
  public cajaSesion:        CajaSesion | null = null;
  public cajaAbierta        = false;
  public mostrarApertura    = false;
  public mostrarCierre      = false;

  get userName(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return 'Usuario';
    return `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || 'Usuario';
  }

  get restaurantName(): string {
    return this.authService.getCurrentRestaurante()?.nombre ?? 'SYNTHAX POS';
  }

  /** Roles que pueden operar la caja (apertura / cierre). */
  get puedeOperarCaja(): boolean {
    return this.authService.hasRole(['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO']);
  }

  // ── Helpers de fecha ──────────────────────────────────────────────────────

  private esHoy(fechaStr?: string): boolean {
    if (!fechaStr) return false;
    const hoy  = new Date();
    const fecha = new Date(fechaStr);
    return fecha.getFullYear() === hoy.getFullYear()
        && fecha.getMonth()    === hoy.getMonth()
        && fecha.getDate()     === hoy.getDate();
  }

  // ── Ventas del día ────────────────────────────────────────────────────────

  get ventasHoy(): Venta[] {
    return this.ventas.filter(v => this.esHoy(v.fechaCreacion));
  }

  get ventasHoyPagadas(): Venta[] {
    return this.ventasHoy.filter(v => v.estado === 'PAGADA');
  }

  get ventasHoyAbiertas(): Venta[] {
    return this.ventasHoy.filter(v => v.estado === 'ABIERTA');
  }

  get ventasHoyAnuladas(): Venta[] {
    return this.ventasHoy.filter(v => v.estado === 'ANULADA');
  }

  get totalVentasHoy(): number {
    return this.ventasHoyPagadas.reduce((s, v) => s + (v.valorTotal ?? 0), 0);
  }

  // ── Compras del día ───────────────────────────────────────────────────────

  get comprasHoy(): Compra[] {
    return this.compras.filter(c => this.esHoy(c.fechaCreacion) && c.activo !== false);
  }

  get totalComprasHoy(): number {
    return this.comprasHoy.reduce((s, c) => s + (c.valorTotal ?? 0), 0);
  }

  // ── Pedidos devueltos del día ─────────────────────────────────────────────

  get pedidosDevueltosHoy(): number {
    return this.pedidos.filter(p =>
      p.estado === 'DEVUELTO' && this.esHoy(p.fechaCreacion)
    ).length;
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const restauranteId = this.authService.getRestauranteId();

    // Cargar estado de caja y datos del dashboard en paralelo
    const dataSources: any = {
      ventas:     this.ventaService.obtenerTodos(),
      compras:    restauranteId
                    ? this.compraService.obtenerPorRestaurante(restauranteId)
                    : this.compraService.obtenerTodas(),
      formasPago: this.formaPagoService.obtenerActivas(),
      pedidos:    this.pedidoService.obtenerTodos(),
    };

    if (this.puedeOperarCaja) {
      dataSources['cajaEstado'] = this.cajaService.obtenerEstado();
    }

    forkJoin(dataSources).subscribe({
      next: (res: any) => {
        this.ventas     = res['ventas'];
        this.compras    = res['compras'];
        this.formasPago = res['formasPago'];
        this.pedidos    = res['pedidos'];

        if (res['cajaEstado']) {
          this.cajaAbierta = res['cajaEstado'].abierta;
          this.cajaSesion  = res['cajaEstado'].sesion;
        }

        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  // ── Acciones de caja ──────────────────────────────────────────────────────

  abrirModalApertura(): void { this.mostrarApertura = true; }
  abrirModalCierre():   void { this.mostrarCierre   = true; }

  onAperturado(sesion: CajaSesion): void {
    this.cajaSesion      = sesion;
    this.cajaAbierta     = true;
    this.mostrarApertura = false;
    this.recargarDatos();
  }

  onCierreOk(reporte: CierreReporteDTO): void {
    this.cajaAbierta   = false;
    this.cajaSesion    = null;
    this.mostrarCierre = false;
    this.recargarDatos();
  }

  private recargarDatos(): void {
    const restauranteId = this.authService.getRestauranteId();
    forkJoin({
      ventas:     this.ventaService.obtenerTodos(),
      compras:    restauranteId
                    ? this.compraService.obtenerPorRestaurante(restauranteId)
                    : this.compraService.obtenerTodas(),
      formasPago: this.formaPagoService.obtenerActivas(),
      pedidos:    this.pedidoService.obtenerTodos(),
    }).subscribe({
      next: (res) => {
        this.ventas     = res.ventas;
        this.compras    = res.compras;
        this.formasPago = res.formasPago;
        this.pedidos    = res.pedidos;
      },
    });
  }

  // ── Formato numérico ──────────────────────────────────────────────────────

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(n);
  }

  fmtHora(s?: string): string {
    if (!s) return '';
    return new Date(s).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
}
