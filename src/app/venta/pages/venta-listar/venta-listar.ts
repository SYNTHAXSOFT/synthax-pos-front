import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { VentaService } from '../../services/venta.service';
import { PagoItem, Venta } from '../../interfaces/venta.interface';
import { ESTADOS_VENTA } from '../../../utils/constantes-utils';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { PedidoService } from '../../../pedido/services/pedido.service';
import { ImpuestoService } from '../../../impuesto/services/impuesto.service';
import { Impuesto } from '../../../impuesto/interfaces/impuesto.interface';
import { Pedido } from '../../../pedido/interfaces/pedido.interface';
import { FormaPagoService } from '../../../forma-pago/services/forma-pago.service';
import { FormaPago } from '../../../forma-pago/interfaces/forma-pago.interface';
import { ClienteService } from '../../../cliente/services/cliente.service';
import { Cliente } from '../../../cliente/interfaces/cliente.interface';
import { TipoPedidoService } from '../../../tipo-pedido/services/tipo-pedido.service';
import { TipoPedido } from '../../../tipo-pedido/interfaces/tipo-pedido.interface';
import { MesaService } from '../../../mesa/services/mesa.service';
import { Mesa } from '../../../mesa/interfaces/mesa.interface';

@Component({
  selector: 'app-venta-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta-listar.html',
  styleUrls: ['./venta-listar.css'],
})
export class VentaListarPageComponent implements OnInit {
  private readonly ventaService      = inject(VentaService);
  private readonly pedidoService     = inject(PedidoService);
  private readonly impuestoService   = inject(ImpuestoService);
  private readonly formaPagoService  = inject(FormaPagoService);
  private readonly clienteService    = inject(ClienteService);
  private readonly tipoPedidoService = inject(TipoPedidoService);
  private readonly mesaService       = inject(MesaService);
  private readonly router            = inject(Router);
  private readonly authService       = inject(AuthService);
  private readonly toastService      = inject(ToastService);
  private readonly confirmService    = inject(ConfirmService);

  public ventas: Venta[]       = [];
  public cargando: boolean     = false;
  public estadoFiltro: string  = 'ABIERTA'; // Por defecto: solo ventas abiertas
  public readonly estadosVenta = ESTADOS_VENTA;

  /** Subtotal estimado (suma de pedidos activos) por ventaId — para ventas ABIERTA */
  public pedidoSubtotalMap: Map<number, number> = new Map();

  /** IDs de ventas que tienen al menos un pedido en estado PEDIDO, PREPARANDO o DEVUELTO (para filtro de COCINERO). */
  public ventaIdsCocinero: Set<number> = new Set();

  /** IDs de ventas que tienen al menos un pedido en estado ENTREGADO_DOMICILIARIO (para filtro de DOMICILIARIO). */
  public ventaIdsDomiciliario: Set<number> = new Set();

  /** Rango de fechas para PROPIETARIO y ADMINISTRADOR */
  public fechaDesde: string = '';
  public fechaHasta: string = '';

  /** Ventas visibles tras aplicar filtros de fecha y estado (cliente-side) */
  get ventasMostradas(): Venta[] {
    let lista = this.ventas;

    if (this.soloHoy) {
      // Roles operativos: solo ven las ventas del día de hoy
      const ahora = new Date();
      lista = lista.filter(v => {
        if (!v.fechaCreacion) return false;
        const fecha = new Date(v.fechaCreacion);
        return fecha.getFullYear() === ahora.getFullYear() &&
               fecha.getMonth()    === ahora.getMonth()    &&
               fecha.getDate()     === ahora.getDate();
      });
    } else {
      // PROPIETARIO / ADMINISTRADOR: filtro por rango de fechas
      if (this.fechaDesde) {
        const desde = new Date(this.fechaDesde + 'T00:00:00');
        lista = lista.filter(v => v.fechaCreacion ? new Date(v.fechaCreacion) >= desde : false);
      }
      if (this.fechaHasta) {
        const hasta = new Date(this.fechaHasta + 'T23:59:59');
        lista = lista.filter(v => v.fechaCreacion ? new Date(v.fechaCreacion) <= hasta : false);
      }
    }

    // COCINERO: solo ventas que tienen al menos un pedido en estado PEDIDO, PREPARANDO o DEVUELTO
    if (this.esCocinero && this.ventaIdsCocinero.size > 0) {
      lista = lista.filter(v => v.id != null && this.ventaIdsCocinero.has(v.id));
    } else if (this.esCocinero && this.ventaIdsCocinero.size === 0 && !this.cargando) {
      lista = [];
    }

    // DOMICILIARIO: solo ventas que tienen al menos un pedido en estado ENTREGADO_DOMICILIARIO
    if (this.esDomiciliario && this.ventaIdsDomiciliario.size > 0) {
      lista = lista.filter(v => v.id != null && this.ventaIdsDomiciliario.has(v.id));
    } else if (this.esDomiciliario && this.ventaIdsDomiciliario.size === 0 && !this.cargando) {
      lista = [];
    }

    // Filtro por estado
    if (this.estadoFiltro) {
      lista = lista.filter(v => v.estado === this.estadoFiltro);
    }

    return lista;
  }

  // ── Modal de cierre ───────────────────────────────────────────────────────
  public modalCerrar: boolean        = false;
  public ventaCierreId: number | null = null;
  public ventaCierreNumero: string | null = null;
  public cerrandoVenta: boolean      = false;
  public cargandoModalData: boolean  = false;

  // ── Subtotal, impuestos y descuento ───────────────────────────────────────
  public subtotalCierre: number = 0;
  public impuestosDisponibles: Impuesto[] = [];
  public impuestosSeleccionados: Set<number> = new Set();
  public descuentoPct: number = 0;
  public motivoDescuento: string = '';

  // ── Formas de pago ────────────────────────────────────────────────────────
  public formasPago: FormaPago[]        = [];
  public formaPagoSeleccionadaId: number | null = null;

  // ── Multipago ─────────────────────────────────────────────────────────────
  public esMultipago: boolean = false;
  public pagosMultiples: { formaPagoId: number | null; monto: number | null }[] = [];

  // ── Cliente y factura electrónica ─────────────────────────────────────────
  public clientesDisponibles: Cliente[]  = [];
  public clienteBusqueda: string         = '';
  public clienteSeleccionado: Cliente | null = null;
  public mostrarDropdownCliente: boolean = false;
  public solicitaFacturaElectronica: boolean = false;

  // ── Crear cliente rápido ──────────────────────────────────────────────────
  public mostrarFormNuevoCliente: boolean = false;
  public guardandoCliente: boolean        = false;
  public nuevoCliente = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };

  // ── Imagen de soporte al cierre ───────────────────────────────────────────
  public soportePreview: string = '';
  public soporteNombre: string  = '';
  @ViewChild('fileInputVenta') fileInputVenta!: ElementRef<HTMLInputElement>;

  // ── Servicios adicionales ─────────────────────────────────────────────────
  public serviciosAdicionales: { descripcion: string; valor: number }[] = [];
  public mostrarFormServicio: boolean  = false;
  public nuevoServicioDescripcion: string = '';
  public nuevoServicioValor: number | null = null;
  /** Copia que se guarda justo antes de cerrar el modal, para imprimirla */
  public serviciosParaImprimir: { descripcion: string; valor: number }[] = [];

  get clientesFiltrados(): Cliente[] {
    const term = this.clienteBusqueda.trim().toLowerCase();
    if (!term) return this.clientesDisponibles.slice(0, 6);
    return this.clientesDisponibles.filter(c =>
      c.cedula.toLowerCase().includes(term) ||
      c.nombre.toLowerCase().includes(term) ||
      c.apellido.toLowerCase().includes(term)
    ).slice(0, 6);
  }

  // ── Datos para impresión de tirilla ──────────────────────────────────────
  public mostrarModalImprimir: boolean = false;
  public ventaParaImprimir?: Venta;
  public pedidosParaImprimir: Pedido[] = [];
  public impuestosParaImprimir: { impuesto: Impuesto; valor: number }[] = [];
  public subtotalParaImprimir: number = 0;
  public descuentoValorParaImprimir: number = 0;
  public totalParaImprimir: number = 0;
  public fechaImpresion: Date = new Date();

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

  get valorDescuento(): number {
    if (!this.descuentoPct || this.descuentoPct <= 0) return 0;
    return Math.round(this.totalConImpuestos * (this.descuentoPct / 100));
  }

  get totalServiciosAdicionales(): number {
    return this.serviciosAdicionales.reduce((s, sv) => s + (sv.valor ?? 0), 0);
  }

  get totalFinal(): number {
    return this.totalConImpuestos - this.valorDescuento + this.totalServiciosAdicionales;
  }

  get sumaPagosMultiples(): number {
    return this.pagosMultiples.reduce((s, p) => s + (p.monto ?? 0), 0);
  }

  get saldoPendienteMultipago(): number {
    return this.totalFinal - this.sumaPagosMultiples;
  }

  /** true cuando todos los ítems tienen forma de pago + monto positivo y la suma cuadra con el total (tolerancia 1 COP). */
  get pagosMultiplesValidos(): boolean {
    return (
      this.pagosMultiples.length >= 2 &&
      this.pagosMultiples.every(p => p.formaPagoId != null && (p.monto ?? 0) > 0) &&
      Math.abs(this.saldoPendienteMultipago) < 1
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  /** Roles que solo pueden ver las ventas del día de hoy */
  get soloHoy(): boolean {
    const rol = this.authService.getUserRole() ?? '';
    return ['CAJERO', 'COCINERO', 'MESERO', 'DOMICILIARIO'].includes(rol);
  }

  /** El cocinero solo puede ver ventas y pedidos, no crear ni cerrar/anular */
  get esCocinero(): boolean {
    return this.authService.getUserRole() === 'COCINERO';
  }

  /** El mesero puede ver ventas y agregar pedidos, pero no cerrar ni anular */
  get esMesero(): boolean {
    return this.authService.getUserRole() === 'MESERO';
  }

  /** El domiciliario solo ve ventas con pedidos en reparto */
  get esDomiciliario(): boolean {
    return this.authService.getUserRole() === 'DOMICILIARIO';
  }

  ngOnInit(): void {
    // Siempre iniciamos con el día de hoy como rango de fechas
    const hoy = this.fechaHoy();
    this.fechaDesde = hoy;
    this.fechaHasta = hoy;
    this.cargarVentas();
  }

  /** Devuelve la fecha de hoy en formato YYYY-MM-DD (requerido por <input type="date">) */
  private fechaHoy(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** Limpia el rango de fechas y reconsulta (PROPIETARIO / ADMINISTRADOR) */
  limpiarFechas(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.cargarVentas();
  }

  /** YYYY-MM-DDTHH:mm:ss sin zona — formato que acepta LocalDateTime.parse() en Java. */
  private startOfTodayStr(): string {
    const d = new Date();
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00:00`;
  }

  cargarVentas(): void {
    this.cargando = true;
    const restauranteId = this.authService.getRestauranteId();

    // Ventas: desde la fecha seleccionada en el filtro (defecto: inicio de hoy).
    // Esto evita cargar todo el historial — el backend aplica la restricción de fecha.
    const fechaDesde = this.fechaDesde
      ? `${this.fechaDesde}T00:00:00`
      : this.startOfTodayStr();

    const ventasObs = this.ventaService.obtenerDesde(fechaDesde)
      .pipe(catchError(() => of([])));

    // Pedidos: siempre solo los de hoy (se usan para subtotales de ventas ABIERTAS
    // y para los filtros de COCINERO / DOMICILIARIO — todos casos del día actual).
    const pedidosObs = (restauranteId
      ? this.pedidoService.obtenerDesde(restauranteId, this.startOfTodayStr())
      : this.pedidoService.obtenerTodos()
    ).pipe(catchError(() => of([])));

    forkJoin({ ventas: ventasObs, pedidos: pedidosObs }).subscribe({
      next: ({ ventas, pedidos }) => {
        this.ventas = ventas as any;

        // ── Mapa de subtotales estimados para ventas ABIERTA ─────────────
        const EXCLUIDOS = new Set(['CANCELADO', 'DESTRUIDO']);
        const mapa = new Map<number, number>();
        for (const p of pedidos as any[]) {
          const vid = p.venta?.id;
          if (!vid || EXCLUIDOS.has(p.estado ?? '')) continue;
          const linea = (p.producto?.precio ?? 0) * (p.cantidad ?? 1);
          mapa.set(vid, (mapa.get(vid) ?? 0) + linea);
        }
        this.pedidoSubtotalMap = mapa;

        // ── Filtros específicos por rol ───────────────────────────────────
        if (this.esCocinero) {
          this.ventaIdsCocinero = new Set(
            (pedidos as any[])
              .filter(p => p.estado === 'PEDIDO' || p.estado === 'PREPARANDO' || p.estado === 'DEVUELTO')
              .map(p => p.venta?.id)
              .filter((id): id is number => id != null)
          );
        }

        if (this.esDomiciliario) {
          this.ventaIdsDomiciliario = new Set(
            (pedidos as any[])
              .filter(p => p.estado === 'ENTREGADO_DOMICILIARIO')
              .map(p => p.venta?.id)
              .filter((id): id is number => id != null)
          );
        }

        this.cargando = false;
      },
      error: (err) => { console.error('Error al cargar ventas:', err); this.cargando = false; },
    });
  }

  /** Recarga desde API y mantiene los filtros activos */
  actualizar(): void {
    this.cargarVentas();
  }

  filtrarPorEstado(estado: string): void {
    this.estadoFiltro = estado;
  }

  // Stats sobre el conjunto filtrado por fecha (sin filtro de estado para mostrar conteos reales)
  get ventasFiltradas(): Venta[] {
    // Igual que ventasMostradas pero sin el filtro de estado
    let lista = this.ventas;
    if (this.soloHoy) {
      const ahora = new Date();
      lista = lista.filter(v => {
        if (!v.fechaCreacion) return false;
        const fecha = new Date(v.fechaCreacion);
        return fecha.getFullYear() === ahora.getFullYear() &&
               fecha.getMonth()    === ahora.getMonth()    &&
               fecha.getDate()     === ahora.getDate();
      });
    } else {
      if (this.fechaDesde) {
        const desde = new Date(this.fechaDesde + 'T00:00:00');
        lista = lista.filter(v => v.fechaCreacion ? new Date(v.fechaCreacion) >= desde : false);
      }
      if (this.fechaHasta) {
        const hasta = new Date(this.fechaHasta + 'T23:59:59');
        lista = lista.filter(v => v.fechaCreacion ? new Date(v.fechaCreacion) <= hasta : false);
      }
    }
    return lista;
  }

  get totalAbiertas(): number { return this.ventasFiltradas.filter(v => v.estado === 'ABIERTA').length; }
  get totalPagadas(): number  { return this.ventasFiltradas.filter(v => v.estado === 'PAGADA').length; }
  get totalAnuladas(): number { return this.ventasFiltradas.filter(v => v.estado === 'ANULADA').length; }

  /** Subtotal estimado de una venta ABIERTA (suma de pedidos activos). */
  getSubtotalAbierta(ventaId?: number): number {
    if (!ventaId) return 0;
    return this.pedidoSubtotalMap.get(ventaId) ?? 0;
  }
  get totalIngresos(): number {
    return this.ventasMostradas
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

  async cancelarVentaVacia(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({
      message: 'Esta venta no tiene productos. ¿Deseas cancelarla y eliminarla del listado?',
      type: 'danger',
    });
    if (!ok) return;
    this.ventaService.anularVenta(id).subscribe({
      next:  () => { this.toastService.success('Venta cancelada'); this.cargarVentas(); },
      error: (err) => { this.toastService.error('Error: ' + (err.error?.error || 'No se pudo cancelar la venta')); },
    });
  }

  async reabrir(venta: Venta): Promise<void> {
    if (!venta.id) return;
    const fp    = venta.formaPago?.nombre ?? 'la forma de pago';
    const total = venta.valorTotal
      ? `$${venta.valorTotal.toLocaleString('es-CO')}`
      : 'el valor cobrado';

    const ok = await this.confirmService.confirm({
      message: `¿Reabrir la venta ${venta.codigo ?? '#' + venta.id}?\n\n` +
               `Se revertirán los siguientes efectos del cierre:\n` +
               `• El stock de insumos será restaurado\n` +
               `• Se descontará ${total} de "${fp}"\n` +
               `• Los pedidos volverán al estado Preparado\n\n` +
               `La venta quedará ABIERTA y podrá modificarse normalmente.`,
      type: 'warning',
    });
    if (!ok) return;

    this.ventaService.reabrirVenta(venta.id).subscribe({
      next: () => {
        this.toastService.success(`Venta ${venta.codigo ?? '#' + venta.id} reabierta. Stock y saldo revertidos.`);
        this.cargarVentas();
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error || 'No se pudo reabrir la venta'));
      },
    });
  }

  // ── Apertura del modal de cierre ──────────────────────────────────────────

  abrirModalCerrar(venta: Venta): void {
    this.ventaCierreId           = venta.id ?? null;
    this.ventaCierreNumero       = venta.codigo ?? `#${venta.id}`;
    this.subtotalCierre          = 0;
    this.impuestosDisponibles    = [];
    this.impuestosSeleccionados  = new Set();
    this.descuentoPct            = 0;
    this.motivoDescuento         = '';
    this.cargandoModalData       = true;
    this.formaPagoSeleccionadaId = null;
    this.clienteBusqueda         = '';
    this.clienteSeleccionado     = null;
    this.mostrarDropdownCliente  = false;
    this.solicitaFacturaElectronica = false;
    this.mostrarFormNuevoCliente = false;
    this.nuevoCliente            = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };
    this.soportePreview          = '';
    this.soporteNombre           = '';
    this.serviciosAdicionales    = [];
    this.mostrarFormServicio     = false;
    this.nuevoServicioDescripcion = '';
    this.nuevoServicioValor      = null;
    this.esMultipago             = false;
    this.pagosMultiples          = [];
    this.modalCerrar             = true;

    forkJoin({
      pedidos:    this.pedidoService.obtenerActivosPorVenta(venta.id!),
      impuestos:  this.impuestoService.obtenerActivos(),
      formasPago: this.formaPagoService.obtenerActivas(),
      clientes:   this.clienteService.listar(),
    }).subscribe({
      next: ({ pedidos, impuestos, formasPago, clientes }) => {
        this.pedidosParaImprimir = pedidos as Pedido[];
        this.subtotalCierre = pedidos.reduce((sum, p) => {
          const precio   = p.producto?.precio ?? 0;
          const cantidad = p.cantidad         ?? 0;
          return sum + precio * cantidad;
        }, 0);
        this.impuestosDisponibles  = impuestos;
        this.formasPago            = formasPago;
        this.clientesDisponibles   = clientes;
        this.cargandoModalData     = false;
      },
      error: (err) => {
        console.error('Error al cargar datos del modal:', err);
        this.toastService.error('Error al cargar los datos de la venta');
        this.cargandoModalData = false;
      },
    });
  }

  // ── Métodos de cliente ────────────────────────────────────────────────────

  onClienteBusquedaChange(): void {
    this.mostrarDropdownCliente = this.clienteBusqueda.trim().length > 0;
    if (this.clienteSeleccionado) {
      this.clienteSeleccionado = null;
      this.solicitaFacturaElectronica = false;
    }
  }

  seleccionarCliente(c: Cliente): void {
    this.clienteSeleccionado    = c;
    this.clienteBusqueda        = '';
    this.mostrarDropdownCliente = false;
    this.mostrarFormNuevoCliente = false;
  }

  limpiarCliente(): void {
    this.clienteSeleccionado        = null;
    this.clienteBusqueda            = '';
    this.mostrarDropdownCliente     = false;
    this.solicitaFacturaElectronica = false;
  }

  abrirFormNuevoCliente(): void {
    this.mostrarFormNuevoCliente = true;
    this.nuevoCliente = {
      nombre: '', apellido: '',
      cedula: this.clienteBusqueda.trim(),
      email: '', telefono: '',
    };
    this.mostrarDropdownCliente = false;
  }

  cerrarFormNuevoCliente(): void {
    this.mostrarFormNuevoCliente = false;
    this.nuevoCliente = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };
  }

  guardarNuevoCliente(): void {
    if (!this.nuevoCliente.nombre.trim() || !this.nuevoCliente.apellido.trim() ||
        !this.nuevoCliente.cedula.trim() || !this.nuevoCliente.email.trim()) {
      this.toastService.warning('Nombre, apellido, cédula y email son obligatorios');
      return;
    }
    this.guardandoCliente = true;
    const payload: Cliente = {
      nombre:   this.nuevoCliente.nombre.trim(),
      apellido: this.nuevoCliente.apellido.trim(),
      cedula:   this.nuevoCliente.cedula.trim(),
      email:    this.nuevoCliente.email.trim(),
      telefono: this.nuevoCliente.telefono.trim() || undefined,
      activo:   true,
    };
    this.clienteService.crear(payload).subscribe({
      next: (creado) => {
        this.clientesDisponibles = [creado, ...this.clientesDisponibles];
        this.seleccionarCliente(creado);
        this.cerrarFormNuevoCliente();
        this.guardandoCliente = false;
        this.toastService.success('Cliente creado y seleccionado');
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error ?? 'No se pudo crear el cliente'));
        this.guardandoCliente = false;
      },
    });
  }

  // ── Métodos de multipago ─────────────────────────────────────────────────

  toggleMultipago(): void {
    this.esMultipago = !this.esMultipago;
    if (this.esMultipago) {
      // Inicializa con 2 filas vacías
      this.pagosMultiples = [
        { formaPagoId: null, monto: null },
        { formaPagoId: null, monto: null },
      ];
      this.formaPagoSeleccionadaId = null;
    } else {
      this.pagosMultiples = [];
    }
  }

  agregarPagoMultiple(): void {
    this.pagosMultiples = [...this.pagosMultiples, { formaPagoId: null, monto: null }];
  }

  quitarPagoMultiple(index: number): void {
    if (this.pagosMultiples.length <= 2) return; // mínimo 2 filas
    this.pagosMultiples = this.pagosMultiples.filter((_, i) => i !== index);
  }

  cerrarModal(): void {
    this.modalCerrar                = false;
    this.ventaCierreId              = null;
    this.ventaCierreNumero          = null;
    this.cerrandoVenta              = false;
    this.cargandoModalData          = false;
    this.subtotalCierre             = 0;
    this.impuestosDisponibles       = [];
    this.impuestosSeleccionados     = new Set();
    this.descuentoPct               = 0;
    this.motivoDescuento            = '';
    this.formaPagoSeleccionadaId    = null;
    this.formasPago                 = [];
    this.clientesDisponibles        = [];
    this.clienteBusqueda            = '';
    this.clienteSeleccionado        = null;
    this.mostrarDropdownCliente     = false;
    this.solicitaFacturaElectronica = false;
    this.mostrarFormNuevoCliente    = false;
    this.nuevoCliente               = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };
    this.soportePreview             = '';
    this.soporteNombre              = '';
    this.serviciosAdicionales       = [];
    this.mostrarFormServicio        = false;
    this.nuevoServicioDescripcion   = '';
    this.nuevoServicioValor         = null;
    this.esMultipago                = false;
    this.pagosMultiples             = [];
  }

  // ── Métodos de imagen de soporte ─────────────────────────────────────────

  abrirSelectorSoporte(): void {
    this.fileInputVenta?.nativeElement.click();
  }

  onSoporteSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`La imagen no puede superar ${maxMB} MB.`);
      input.value = '';
      return;
    }

    this.soporteNombre = file.name;
    input.value = '';
    this.comprimirImagen(file, 800, 0.6).then(b64 => { this.soportePreview = b64; });
  }

  private comprimirImagen(file: File, maxPx: number, quality: number): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width);  width  = maxPx; }
          else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = url;
    });
  }

  quitarSoporte(): void {
    this.soportePreview = '';
    this.soporteNombre  = '';
  }

  // ── Servicios adicionales ─────────────────────────────────────────────────

  agregarServicio(): void {
    const desc = this.nuevoServicioDescripcion.trim();
    const val  = this.nuevoServicioValor ?? 0;
    if (!desc) {
      this.toastService.warning('La descripción del servicio es obligatoria.');
      return;
    }
    if (val <= 0) {
      this.toastService.warning('El valor del servicio debe ser mayor a 0.');
      return;
    }
    this.serviciosAdicionales     = [...this.serviciosAdicionales, { descripcion: desc, valor: val }];
    this.nuevoServicioDescripcion = '';
    this.nuevoServicioValor       = null;
    this.mostrarFormServicio      = false;
  }

  quitarServicio(index: number): void {
    this.serviciosAdicionales = this.serviciosAdicionales.filter((_, i) => i !== index);
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

    if (this.esMultipago) {
      if (this.pagosMultiples.some(p => p.formaPagoId == null || (p.monto ?? 0) <= 0)) {
        this.toastService.warning('Completa la forma de pago y el monto de cada ítem.');
        return;
      }
      if (Math.abs(this.saldoPendienteMultipago) >= 1) {
        const sum = this.sumaPagosMultiples.toLocaleString('es-CO');
        const tot = this.totalFinal.toLocaleString('es-CO');
        this.toastService.warning(`La suma de pagos ($${sum}) no coincide con el total ($${tot}).`);
        return;
      }
    } else {
      if (!this.formaPagoSeleccionadaId) {
        this.toastService.warning('Debes seleccionar una forma de pago.');
        return;
      }
    }

    if (this.descuentoPct > 0 && !this.motivoDescuento.trim()) {
      this.toastService.warning('Debes ingresar el motivo del descuento.');
      return;
    }

    this.cerrandoVenta = true;
    const facturadorId = this.authService.getUserId() ?? undefined;

    // Capturamos datos para la tirilla antes de cerrar el modal
    const ventaEnCierre = this.ventasAbiertas?.find(v => v.id === this.ventaCierreId);

    // Lista de pagos para multipago (undefined = pago único)
    const pagos: PagoItem[] | undefined = this.esMultipago
      ? this.pagosMultiples.map(p => ({ formaPagoId: p.formaPagoId!, monto: p.monto! }))
      : undefined;

    this.ventaService.cerrarVenta(
      this.ventaCierreId,
      this.totalFinal,
      facturadorId,
      this.descuentoPct > 0 ? this.descuentoPct : undefined,
      this.motivoDescuento.trim() || undefined,
      this.esMultipago ? undefined : (this.formaPagoSeleccionadaId ?? undefined),
      this.clienteSeleccionado?.id,
      this.solicitaFacturaElectronica || undefined,
      this.soportePreview || undefined,
      pagos,
    ).subscribe({
      next: (ventaCerrada) => {
        this.toastService.success('Venta cerrada · Stock de insumos actualizado');

        // Preparar datos de impresión
        this.ventaParaImprimir          = ventaCerrada ?? ventaEnCierre;
        this.impuestosParaImprimir      = [...this.totalImpuestosAplicados];
        this.subtotalParaImprimir       = this.subtotalCierre;
        this.descuentoValorParaImprimir = this.valorDescuento;
        this.totalParaImprimir          = this.totalFinal;
        this.serviciosParaImprimir      = [...this.serviciosAdicionales];
        this.fechaImpresion             = new Date();

        this.cerrarModal();
        this.cargarVentas();
        this.mostrarModalImprimir = true;
      },
      error: (err) => {
        this.cerrandoVenta = false;
        this.toastService.error('Error: ' + (err.error?.error || 'No se pudo cerrar la venta'));
      },
    });
  }

  imprimirTirilla(): void {
    const venta = this.ventaParaImprimir;
    if (!venta) return;

    /* ── Helpers numéricos ── */
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const fmtDate = (d: Date) => {
      const dd  = String(d.getDate()).padStart(2, '0');
      const mm  = String(d.getMonth() + 1).padStart(2, '0');
      const yy  = String(d.getFullYear()).slice(2); // 2 dígitos
      const hh  = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yy} ${hh}:${min}`;    // "24/05/26 21:30"
    };

    /*
     * ── ENFOQUE PRE/MONOSPACE ────────────────────────────────────────────────
     * Razón: table-layout:fixed en HTML no garantiza el ancho en impresoras
     * térmicas porque cada driver maneja los márgenes de forma diferente.
     * Con <pre> + fuente monoespaciada, cada línea tiene EXACTAMENTE W chars
     * → imposible que se desborde.
     */
    const W = 28; // chars por línea (bold Courier 10pt en papel 80mm ≈ 28 chars seguros con margen)

    /* Normaliza texto: sin saltos de línea, máximo `max` chars */
    const trunc = (s: unknown, max: number): string =>
      String(s ?? '').replace(/[\n\r]/g, ' ').trim().slice(0, max);

    /* Abrevia nombre completo para que quepa en `max` chars */
    const abrevNombre = (nombre: string, max: number): string => {
      if (nombre.length <= max) return nombre;
      const partes = nombre.split(/\s+/).filter(Boolean);
      if (partes.length <= 1) return nombre.slice(0, max);
      let r = partes[0];
      for (let i = 1; i < partes.length; i++) {
        const init = ` ${partes[i][0]}.`;
        if (r.length + init.length <= max) r += init; else break;
      }
      return r.slice(0, max);
    };

    /* Centra texto en W chars */
    const center = (s: string): string => {
      const t = trunc(s, W);
      const pad = Math.floor((W - t.length) / 2);
      return ' '.repeat(pad) + t;
    };

    /*
     * Fila de 2 columnas: etiqueta (izq 13 chars) + valor (der 15 chars) = 28
     * El valor se abrevia si es demasiado largo.
     */
    const lr = (label: string, value: string): string => {
      const MAX_R = 15;
      const MAX_L = W - MAX_R; // 13
      const l = trunc(label, MAX_L).padEnd(MAX_L);
      const r = trunc(value, MAX_R).padStart(MAX_R);
      return l + r;
    };

    /*
     * Fila de producto: nombre (14) | cant (4) | total (10) = 28
     */
    const prodLine = (nombre: string, cant: number, totalStr: string): string => {
      const N = 14, C = 4, T = 10;
      return trunc(nombre, N).padEnd(N) +
             String(cant).padStart(C) +
             trunc(totalStr, T).padStart(T);
    };

    const DIV  = '-'.repeat(W);
    const DIVB = '='.repeat(W);

    /* ── Datos del restaurante ── */
    const rest        = this.authService.getCurrentRestaurante();
    const restNombre  = trunc(rest?.nombre ?? 'MOED', W);

    /* ── Construir array de líneas ── */
    const lines: string[] = [];

    // Encabezado
    lines.push(center(restNombre.toUpperCase()));
    if (rest?.nit)       lines.push(center(`NIT: ${rest.nit}`));
    if (rest?.telefono)  lines.push(center(`Tel: ${rest.telefono}`));
    if (rest?.direccion) {
      // Wrap dirección larga en varias líneas centradas
      const dir = rest.direccion.replace(/[\n\r]/g, ' ').trim();
      for (let i = 0; i < dir.length; i += W) {
        lines.push(center(dir.slice(i, i + W).trim()));
      }
    }
    if (venta.tipoPedido?.nombre) {
      lines.push(center(venta.tipoPedido.nombre.toUpperCase()));
    }
    lines.push(DIV);

    // Meta de la venta
    lines.push(lr('Ticket #', String(venta.id ?? '')));
    lines.push(lr('Fecha', fmtDate(this.fechaImpresion)));
    if (venta.mesa?.nombre) {
      lines.push(lr('Mesa', trunc(venta.mesa.nombre, 17)));
    }
    if (venta.usuarioCreador) {
      const nom = `${venta.usuarioCreador.nombre ?? ''} ${venta.usuarioCreador.apellido ?? ''}`.trim();
      lines.push(lr('Atendido', abrevNombre(nom, 17)));
    }
    if (venta.usuarioCliente) {
      const nom = `${venta.usuarioCliente.nombre ?? ''} ${venta.usuarioCliente.apellido ?? ''}`.trim();
      lines.push(lr('Cliente', abrevNombre(nom, 17)));
    }
    lines.push(DIV);

    // Cabecera de productos
    lines.push('Producto'.padEnd(14) + 'Cant'.padStart(4) + 'Total'.padStart(10));
    lines.push(DIVB);

    // Productos
    for (const p of this.pedidosParaImprimir) {
      const precio   = p.producto?.precio ?? 0;
      const cantidad = p.cantidad ?? 1;
      const totalStr = `$${fmt(precio * cantidad)}`;
      lines.push(prodLine(p.producto?.nombre ?? '', cantidad, totalStr));
      if (p.observacion) {
        lines.push(' > ' + trunc(p.observacion, W - 3));
      }
    }

    // Servicios adicionales
    if (this.serviciosParaImprimir.length > 0) {
      lines.push(DIV);
      lines.push(center('SERV. ADICIONALES'));
      for (const sv of this.serviciosParaImprimir) {
        lines.push(lr(trunc(sv.descripcion, 13), `$${fmt(sv.valor)}`));  // label max=13
      }
    }

    lines.push(DIV);

    // Totales
    lines.push(lr('Subtotal', `$${fmt(this.subtotalParaImprimir)}`));
    for (const t of this.impuestosParaImprimir) {
      const desc = trunc(`${t.impuesto.descripcion} ${t.impuesto.porcentajeImpuesto}%`, 13);
      lines.push(lr(desc, `+$${fmt(t.valor)}`));
    }
    if (this.descuentoValorParaImprimir > 0) {
      lines.push(lr(`Desc. ${venta.descuento}%`, `-$${fmt(this.descuentoValorParaImprimir)}`));
      if (venta.motivoDescuento) {
        lines.push(' > ' + trunc(venta.motivoDescuento, W - 3));
      }
    }

    lines.push(DIVB);

    // TOTAL (negrita visual: mayúsculas + valor derecho)
    const totalStr2 = `$${fmt(this.totalParaImprimir)}`;
    lines.push('TOTAL'.padEnd(W - totalStr2.length) + totalStr2);

    lines.push(DIVB);

    // Observaciones de la venta
    if (venta.observacion) {
      lines.push(center('-- INSTRUCCIONES --'));
      const obs = venta.observacion.replace(/[\n\r]/g, ' ').trim();
      for (let i = 0; i < obs.length; i += W) {
        lines.push(obs.slice(i, i + W));
      }
      lines.push(DIV);
    }

    // Pie de página
    lines.push(center('¡Gracias por su compra!'));
    lines.push(center(restNombre));

    /* ── Escapar caracteres especiales HTML para el <pre> ── */
    const safe = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const preContent = lines.map(safe).join('\n');

    /* ── HTML completo ── */
    const logoTag = rest?.logo
      ? `<img src="${rest.logo}" alt="${restNombre}" style="display:block;margin:0 auto 4mm;max-height:18mm;max-width:50mm;object-fit:contain;">`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8">
  <title>Tirilla #${venta.id}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      font-weight: bold;
      color: #000;
      background: #fff;
      width: 80mm;
      padding: 3mm 4mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      font-weight: bold;
      color: #000;
      white-space: pre;
      line-height: 1.45;
      margin: 0;
      width: 100%;
      overflow: hidden;
    }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { width: 100%; padding: 3mm 4mm; }
    }
  </style>
</head><body>
  ${logoTag}
  <pre>${preContent}</pre>
</body></html>`;

    /* ── Abrir ventana emergente y lanzar impresión ── */
    const win = window.open('', '_blank', 'width=420,height=650,scrollbars=yes');
    if (!win) {
      this.toastService.warning('El navegador bloqueó la ventana emergente. Permita ventanas emergentes para este sitio e intente de nuevo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 600);
  }

  cerrarModalImprimir(): void {
    this.mostrarModalImprimir   = false;
    this.ventaParaImprimir      = undefined;
    this.pedidosParaImprimir    = [];
  }

  /** Carga los pedidos de una venta ya cerrada (PAGADA) y lanza la impresión directa */
  imprimirTirillaExistente(venta: Venta): void {
    this.pedidoService.obtenerPorVenta(venta.id!).subscribe({
      next: (pedidos) => {
        this.ventaParaImprimir          = venta;
        this.pedidosParaImprimir        = pedidos as Pedido[];
        this.subtotalParaImprimir       = pedidos.reduce(
          (s, p) => s + (p.producto?.precio ?? 0) * (p.cantidad ?? 0), 0
        );
        this.impuestosParaImprimir      = [];
        this.descuentoValorParaImprimir = 0;
        this.totalParaImprimir          = venta.valorTotal ?? 0;
        this.fechaImpresion             = venta.fechaCreacion ? new Date(venta.fechaCreacion) : new Date();
        this.imprimirTirilla();
      },
      error: () => this.toastService.error('No se pudo cargar la información de la venta'),
    });
  }

  get ventasAbiertas(): Venta[] {
    return this.ventas.filter(v => v.estado === 'ABIERTA');
  }

  getBadgeClass(estado?: string): string {
    switch (estado) {
      case 'ABIERTA': return 'spx-venta-badge spx-venta-badge--open';
      case 'PAGADA':  return 'spx-venta-badge spx-venta-badge--paid';
      case 'ANULADA': return 'spx-venta-badge spx-venta-badge--void';
      default:        return 'spx-venta-badge';
    }
  }

  // ── Modal de edición ─────────────────────────────────────────────────────
  public modalEditar:        boolean       = false;
  public ventaEditando:      Venta | null  = null;
  public guardandoEdicion:   boolean       = false;
  public editTipoPedidoId:   number | null = null;
  public editMesaId:         number | null = null;
  public editObservacion:    string        = '';
  public tiposPedidoEdit:    TipoPedido[]  = [];
  public mesasEdit:          Mesa[]        = [];
  public cargandoEdicion:    boolean       = false;

  /** Solo PROPIETARIO, ADMINISTRADOR y ROOT pueden editar ventas */
  get puedeEditarVenta(): boolean {
    const rol = this.authService.getUserRole() ?? '';
    return ['PROPIETARIO', 'ADMINISTRADOR', 'ROOT'].includes(rol);
  }

  abrirModalEditar(venta: Venta): void {
    this.ventaEditando    = venta;
    this.editTipoPedidoId = venta.tipoPedido?.id ?? null;
    this.editMesaId       = venta.mesa?.id       ?? null;
    this.editObservacion  = venta.observacion     ?? '';
    this.guardandoEdicion = false;
    this.cargandoEdicion  = true;
    this.modalEditar      = true;

    forkJoin({
      tipos: this.tipoPedidoService.obtenerActivos(),
      mesas: this.mesaService.obtenerActivos(),
    }).subscribe({
      next: ({ tipos, mesas }) => {
        this.tiposPedidoEdit = tipos;
        this.mesasEdit       = mesas;
        this.cargandoEdicion = false;
      },
      error: () => {
        this.toastService.error('Error al cargar los datos de edición');
        this.cargandoEdicion = false;
      },
    });
  }

  cerrarModalEditar(): void {
    this.modalEditar      = false;
    this.ventaEditando    = null;
    this.guardandoEdicion = false;
    this.cargandoEdicion  = false;
    this.editTipoPedidoId = null;
    this.editMesaId       = null;
    this.editObservacion  = '';
    this.tiposPedidoEdit  = [];
    this.mesasEdit        = [];
  }

  guardarEdicion(): void {
    if (!this.ventaEditando?.id || !this.editTipoPedidoId) {
      this.toastService.warning('El tipo de pedido es obligatorio.');
      return;
    }

    this.guardandoEdicion = true;
    const payload: any = {
      tipoPedido:     { id: this.editTipoPedidoId },
      mesa:           this.editMesaId ? { id: this.editMesaId } : null,
      observacion:    this.editObservacion.trim() || null,
      usuarioCreador: { id: this.ventaEditando.usuarioCreador?.id },
      estado:         this.ventaEditando.estado,
      activo:         this.ventaEditando.activo ?? true,
    };

    this.ventaService.actualizar(this.ventaEditando.id, payload).subscribe({
      next: () => {
        this.toastService.success('Venta actualizada correctamente.');
        this.guardandoEdicion = false;
        this.cerrarModalEditar();
        this.cargarVentas();
      },
      error: (err) => {
        this.guardandoEdicion = false;
        this.toastService.error('Error: ' + (err.error?.error || 'No se pudo actualizar la venta'));
      },
    });
  }

  // ── Lightbox de imagen de soporte (lazy) ─────────────────────────────────
  ventaImagenActiva: Venta | null = null;
  comprobanteViewing: string | null = null;
  comprobanteCargando: boolean      = false;

  /**
   * Abre el lightbox y carga la imagen solo al hacer clic.
   * La imagen NO se envía en el listado — se pide al endpoint /comprobante en ese momento.
   */
  verImagen(v: Venta): void {
    this.ventaImagenActiva  = v;
    this.comprobanteViewing = null;
    this.comprobanteCargando = true;
    document.body.style.overflow = 'hidden';

    this.ventaService.obtenerComprobante(v.id!).subscribe({
      next: (resp) => {
        this.comprobanteViewing  = resp.imagenSoporte;
        this.comprobanteCargando = false;
      },
      error: () => {
        this.comprobanteCargando = false;
        this.cerrarImagen();
        this.toastService.error('No se pudo cargar el comprobante');
      },
    });
  }

  cerrarImagen(): void {
    this.ventaImagenActiva   = null;
    this.comprobanteViewing  = null;
    this.comprobanteCargando = false;
    document.body.style.overflow = '';
  }

  descargarImagen(): void {
    if (!this.comprobanteViewing) return;
    const a = document.createElement('a');
    a.href     = this.comprobanteViewing;
    a.download = `comprobante-venta-${this.ventaImagenActiva?.codigo ?? this.ventaImagenActiva?.id}.jpg`;
    a.click();
  }
}
