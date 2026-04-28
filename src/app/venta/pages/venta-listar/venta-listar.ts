import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
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
import { Pedido } from '../../../pedido/interfaces/pedido.interface';
import { FormaPagoService } from '../../../forma-pago/services/forma-pago.service';
import { FormaPago } from '../../../forma-pago/interfaces/forma-pago.interface';
import { ClienteService } from '../../../cliente/services/cliente.service';
import { Cliente } from '../../../cliente/interfaces/cliente.interface';

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
  private readonly router            = inject(Router);
  private readonly authService       = inject(AuthService);
  private readonly toastService      = inject(ToastService);
  private readonly confirmService    = inject(ConfirmService);

  public ventas: Venta[]       = [];
  public cargando: boolean     = false;
  public estadoFiltro: string  = '';
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
    // Para PROPIETARIO / ADMINISTRADOR inicia el filtro en "hoy"
    if (!this.soloHoy) {
      const hoy = this.fechaHoy();
      this.fechaDesde = hoy;
      this.fechaHasta = hoy;
    }
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

  /** Limpia el rango de fechas (PROPIETARIO / ADMINISTRADOR) */
  limpiarFechas(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  cargarVentas(): void {
    this.cargando = true;
    // Siempre cargamos pedidos en paralelo para calcular subtotales de ventas ABIERTA
    forkJoin({
      ventas:  this.ventaService.obtenerTodos(),
      pedidos: this.pedidoService.obtenerTodos(),
    }).subscribe({
      next: ({ ventas, pedidos }) => {
        this.ventas = ventas;

        // ── Mapa de subtotales estimados para ventas ABIERTA ─────────────
        const EXCLUIDOS = new Set(['CANCELADO', 'DESTRUIDO']);
        const mapa = new Map<number, number>();
        for (const p of pedidos) {
          const vid = p.venta?.id;
          if (!vid || EXCLUIDOS.has(p.estado ?? '')) continue;
          const linea = (p.producto?.precio ?? 0) * (p.cantidad ?? 1);
          mapa.set(vid, (mapa.get(vid) ?? 0) + linea);
        }
        this.pedidoSubtotalMap = mapa;

        // ── Filtros específicos por rol ───────────────────────────────────
        if (this.esCocinero) {
          this.ventaIdsCocinero = new Set(
            pedidos
              .filter(p => p.estado === 'PEDIDO' || p.estado === 'PREPARANDO' || p.estado === 'DEVUELTO')
              .map(p => p.venta?.id)
              .filter((id): id is number => id != null)
          );
        }

        if (this.esDomiciliario) {
          this.ventaIdsDomiciliario = new Set(
            pedidos
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
    const reader = new FileReader();
    reader.onload = () => { this.soportePreview = reader.result as string; };
    reader.readAsDataURL(file);
    input.value = '';
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
    if (!this.formaPagoSeleccionadaId) {
      this.toastService.warning('Debes seleccionar una forma de pago.');
      return;
    }
    if (this.descuentoPct > 0 && !this.motivoDescuento.trim()) {
      this.toastService.warning('Debes ingresar el motivo del descuento.');
      return;
    }

    this.cerrandoVenta = true;
    const facturadorId = this.authService.getUserId() ?? undefined;

    // Capturamos datos para la tirilla antes de cerrar el modal
    const ventaEnCierre = this.ventasAbiertas?.find(v => v.id === this.ventaCierreId);

    this.ventaService.cerrarVenta(
      this.ventaCierreId,
      this.totalFinal,
      facturadorId,
      this.descuentoPct > 0 ? this.descuentoPct : undefined,
      this.motivoDescuento.trim() || undefined,
      this.formaPagoSeleccionadaId ?? undefined,
      this.clienteSeleccionado?.id,
      this.solicitaFacturaElectronica || undefined,
      this.soportePreview || undefined,
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

    /* ── Helpers de formato ── */
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const fmtDate = (d: Date) => {
      const dd  = String(d.getDate()).padStart(2, '0');
      const mm  = String(d.getMonth() + 1).padStart(2, '0');
      const yy  = d.getFullYear();
      const hh  = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yy} ${hh}:${min}`;
    };

    /* ── Datos del restaurante ── */
    const rest = this.authService.getCurrentRestaurante();
    const restNombre    = rest?.nombre    ?? 'SYNTHAX POS';
    const restTelefono  = rest?.telefono  ? `<p style="font-size:10px;margin:1px 0;">Tel: ${rest.telefono}</p>` : '';
    const restDireccion = rest?.direccion ? `<p style="font-size:10px;margin:1px 0;">${rest.direccion}</p>` : '';
    const restNit       = rest?.nit       ? `<p style="font-size:10px;margin:1px 0;">NIT: ${rest.nit}</p>` : '';

    /* ── Bloques de HTML ── */
    const itemsHtml = this.pedidosParaImprimir.map(p => {
      const precio   = p.producto?.precio ?? 0;
      const cantidad = p.cantidad ?? 1;
      const obsHtml  = p.observacion
        ? `<br><small style="font-size:9px;color:#555;">↳ ${p.observacion}</small>`
        : '';
      return `<tr>
        <td style="padding:3px 0;vertical-align:top;">${p.producto?.nombre ?? ''}${obsHtml}</td>
        <td style="text-align:center;padding:3px 2px;vertical-align:top;">${cantidad}</td>
        <td style="text-align:right;padding:3px 0;vertical-align:top;">$ ${fmt(precio * cantidad)}</td>
      </tr>`;
    }).join('');

    const serviciosHtml = this.serviciosParaImprimir.length > 0
      ? `<div class="div"></div>
         <div style="margin:4px 0;">
           <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;color:#555;">Servicios adicionales</div>
           ${this.serviciosParaImprimir.map(sv =>
             `<div style="display:flex;justify-content:space-between;font-size:11px;margin:2px 0;">
               <span>${sv.descripcion}</span>
               <span>$ ${fmt(sv.valor)}</span>
             </div>`
           ).join('')}
         </div>`
      : '';

    const impuestosHtml = this.impuestosParaImprimir.map(t =>
      `<div style="display:flex;justify-content:space-between;font-size:11px;margin:2px 0;">
        <span>${t.impuesto.descripcion} (${t.impuesto.porcentajeImpuesto}%)</span>
        <span>+ $ ${fmt(t.valor)}</span>
      </div>`
    ).join('');

    const descuentoHtml = this.descuentoValorParaImprimir > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:11px;margin:2px 0;font-weight:600;">
           <span>Descuento (${venta.descuento}%)</span>
           <span>- $ ${fmt(this.descuentoValorParaImprimir)}</span>
         </div>
         ${venta.motivoDescuento
           ? `<div style="font-size:9px;color:#555;font-style:italic;margin:1px 0 4px 8px;">${venta.motivoDescuento}</div>`
           : ''}`
      : '';

    const mesaHtml    = venta.mesa?.nombre
      ? `<p style="font-size:11px;margin:2px 0;">Mesa: ${venta.mesa.nombre}</p>` : '';
    const creadorHtml = venta.usuarioCreador
      ? `<div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0;">
           <span>Atendido por</span>
           <span>${venta.usuarioCreador.nombre} ${venta.usuarioCreador.apellido}</span>
         </div>` : '';
    const clienteHtml = venta.usuarioCliente
      ? `<div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0;">
           <span>Cliente</span>
           <span>${venta.usuarioCliente.nombre} ${venta.usuarioCliente.apellido}</span>
         </div>` : '';
    const obsVentaHtml = venta.observacion
      ? `<div style="font-size:10px;margin:6px 0;padding:4px 0;border-top:1px dashed #000;">
           <strong>Instrucciones:</strong> ${venta.observacion}
         </div>` : '';

    /* ── HTML completo de la tirilla ── */
    const html = `<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8">
  <title>Tirilla #${venta.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 80mm; max-width: 80mm;
      margin: 0 auto; padding: 8px;
      font-family: 'Courier New', monospace;
      font-size: 11px; color: #000; background: #fff;
    }
    @media print {
      body { width: 80mm; margin: 0; padding: 8px; }
      @page { size: 80mm auto; margin: 0; }
    }
    table { width: 100%; border-collapse: collapse; }
    .div  { border-top: 1px dashed #000; margin: 6px 0; }
    .divB { border-top: 2px solid  #000; margin: 6px 0; }
  </style>
</head><body>

  <div style="text-align:center;margin-bottom:8px;">
    <div style="font-size:24px;margin-bottom:4px;">&#127869;</div>
    <h2 style="font-size:16px;font-weight:700;margin:0 0 2px 0;text-transform:uppercase;letter-spacing:2px;">${restNombre}</h2>
    ${restNit}
    ${restTelefono}
    ${restDireccion}
    <p style="font-size:12px;font-weight:600;margin:4px 0 0 0;text-transform:uppercase;">${venta.tipoPedido?.nombre ?? ''}</p>
    ${mesaHtml}
  </div>

  <div class="div"></div>

  <div style="margin:4px 0;">
    <div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0;">
      <span>Ticket #</span><span>${venta.id}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0;">
      <span>Fecha</span><span>${fmtDate(this.fechaImpresion)}</span>
    </div>
    ${creadorHtml}
    ${clienteHtml}
  </div>

  <div class="div"></div>

  <table style="font-size:11px;margin:4px 0;">
    <thead>
      <tr style="border-bottom:1px dashed #000;">
        <th style="text-align:left;padding:2px 0;">Producto</th>
        <th style="text-align:center;padding:2px;">Cant.</th>
        <th style="text-align:right;padding:2px 0;">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  ${serviciosHtml}

  <div class="div"></div>

  <div style="margin:4px 0;">
    <div style="display:flex;justify-content:space-between;font-size:11px;margin:2px 0;">
      <span>Subtotal</span><span>$ ${fmt(this.subtotalParaImprimir)}</span>
    </div>
    ${impuestosHtml}
    ${descuentoHtml}
  </div>

  <div class="divB"></div>

  <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:4px 0;letter-spacing:1px;">
    <span>TOTAL</span><span>$ ${fmt(this.totalParaImprimir)}</span>
  </div>

  <div class="divB"></div>

  ${obsVentaHtml}

  <div style="text-align:center;margin-top:10px;font-size:11px;">
    <p style="margin:2px 0;">¡Gracias por su compra!</p>
    <p style="margin:2px 0;">${restNombre}</p>
  </div>

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

  // ── Lightbox de imagen de soporte ────────────────────────────────────────
  ventaImagenActiva: Venta | null = null;

  verImagen(v: Venta): void {
    this.ventaImagenActiva = v;
  }

  cerrarImagen(): void {
    this.ventaImagenActiva = null;
  }

  descargarImagen(v: Venta): void {
    if (!v.imagenSoporte) return;
    const a = document.createElement('a');
    a.href     = v.imagenSoporte;
    a.download = `soporte-venta-${v.id}.jpg`;
    a.click();
  }
}
