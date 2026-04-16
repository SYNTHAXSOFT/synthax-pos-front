import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  /** Fecha de apertura de la sesión activa. Cuando está disponible, las métricas
   *  se calculan desde este momento en lugar del inicio del día. */
  public fechaApertura: Date | null = null;

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

  /** Solo roles administrativos pueden gestionar formas de pago. */
  get puedeGestionarFormasPago(): boolean {
    return this.authService.hasRole(['ROOT', 'PROPIETARIO', 'ADMINISTRADOR']);
  }

  /** Accesos rápidos solo para roles administrativos. */
  get puedeVerAccesosRapidos(): boolean {
    return this.authService.hasRole(['ROOT', 'PROPIETARIO', 'ADMINISTRADOR']);
  }

  // ── Helpers de fecha ──────────────────────────────────────────────────────

  /**
   * Retorna true si la fecha es posterior o igual al inicio del período actual.
   * Si hay una sesión de caja abierta, el período arranca desde la apertura.
   * Si no, se usa el inicio del día (00:00:00).
   */
  private esDesdeApertura(fechaStr?: string): boolean {
    if (!fechaStr) return false;
    // Si la caja está cerrada no hay sesión activa: los contadores deben quedar en cero.
    if (!this.cajaAbierta || !this.fechaApertura) return false;
    return new Date(fechaStr) >= this.fechaApertura;
  }

  // ── Ventas del período (desde apertura de caja) ───────────────────────────

  get ventasHoy(): Venta[] {
    return this.ventas.filter(v => this.esDesdeApertura(v.fechaCreacion));
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

  // ── Compras del período (desde apertura de caja) ─────────────────────────

  get comprasHoy(): Compra[] {
    return this.compras.filter(c => this.esDesdeApertura(c.fechaCreacion) && c.activo !== false);
  }

  get totalComprasHoy(): number {
    return this.comprasHoy.reduce((s, c) => s + (c.valorTotal ?? 0), 0);
  }

  // ── Pedidos devueltos del período (desde apertura de caja) ───────────────

  get pedidosDevueltosHoy(): number {
    return this.pedidos.filter(p =>
      p.estado === 'DEVUELTO' && this.esDesdeApertura(p.fechaCreacion)
    ).length;
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const restauranteId = this.authService.getRestauranteId();

    // Cargar estado de caja y datos del dashboard en paralelo
    const dataSources: any = {
      ventas:     this.ventaService.obtenerTodos().pipe(
                    catchError(() => of([]))),
      compras:    (restauranteId
                    ? this.compraService.obtenerPorRestaurante(restauranteId)
                    : this.compraService.obtenerTodas()).pipe(
                    catchError(() => of([]))),
      formasPago: this.formaPagoService.obtenerActivas().pipe(
                    catchError(() => of([]))),
      pedidos:    this.pedidoService.obtenerTodos().pipe(
                    catchError(() => of([]))),
    };

    if (this.puedeOperarCaja) {
      // catchError: si el endpoint falla (ej. cajero sin restaurante asignado)
      // no rompe el forkJoin — simplemente marca la caja como cerrada.
      dataSources['cajaEstado'] = this.cajaService.obtenerEstado().pipe(
        catchError(() => of({ abierta: false, sesion: null }))
      );
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
          this.fechaApertura = this.cajaSesion?.fechaApertura
            ? new Date(this.cajaSesion.fechaApertura)
            : null;
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
    this.fechaApertura   = sesion.fechaApertura ? new Date(sesion.fechaApertura) : null;
    this.recargarDatos();
  }

  onCierreOk(reporte: CierreReporteDTO): void {
    this.cajaAbierta   = false;
    this.cajaSesion    = null;
    this.mostrarCierre = false;
    this.fechaApertura = null;
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
