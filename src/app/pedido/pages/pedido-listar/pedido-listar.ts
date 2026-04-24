import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../services/pedido.service';
import { CambioEstadoRequest, Pedido, PedidoEstado } from '../../interfaces/pedido.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-pedido-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedido-listar.html',
  styleUrls: ['./pedido-listar.css'],
})
export class PedidoListarPageComponent implements OnInit, OnChanges {
  private readonly pedidoService  = inject(PedidoService);
  private readonly toastService   = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly authService    = inject(AuthService);

  @Input() ventaId?: number;
  /** Cuando la venta está PAGADA, todos los ítems son solo lectura */
  @Input() ventaPagada: boolean = false;

  public pedidos:  Pedido[]  = [];
  public cargando: boolean   = false;
  public enviandoTodos = false;

  // ── Modal para motivo (CANCELADO / DESTRUIDO) ───────────────────────────────
  public modalVisible    = false;
  public modalTitulo     = '';
  public modalMotivo     = '';
  public modalPedidoId?: number;
  public modalEstado?: PedidoEstado;

  // ── Rol del usuario logueado ────────────────────────────────────────────────
  private get rol(): string { return this.authService.getUserRole() ?? ''; }
  get esCocinero():     boolean { return this.rol === 'COCINERO'; }
  get esDomiciliario(): boolean { return this.rol === 'DOMICILIARIO'; }

  ngOnInit(): void  { this.cargarPedidos(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ventaId']) this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.cargando = true;
    const obs = this.ventaId
      ? this.pedidoService.obtenerPorVenta(this.ventaId)   // todos (incluidos cancelados)
      : this.pedidoService.obtenerTodos();

    obs.subscribe({
      next:  (data) => { this.pedidos = data; this.cargando = false; },
      error: (err)  => { console.error('Error al cargar pedidos:', err); this.cargando = false; },
    });
  }

  // ── FIX #1: Helper para estado efectivo ─────────────────────────────────────
  // Si el backend devuelve null (filas previas a la migración), asumimos CREADO.
  estadoEfectivo(p: Pedido): PedidoEstado {
    return p.estado ?? 'CREADO';
  }

  // ── Filtro de pedidos visible según rol ──────────────────────────────────────
  // COCINERO: solo ve los que tienen trabajo pendiente en cocina
  //   PEDIDO = esperando preparación | PREPARANDO = en preparación | DEVUELTO = re-preparación
  // DOMICILIARIO: solo ve los que están en reparto (pendientes de confirmar entrega)
  //   ENTREGADO_DOMICILIARIO = asignado a domiciliario, esperando confirmación de entrega
  // Resto de roles: ven todos los ítems
  get pedidosVisibles(): Pedido[] {
    if (this.esCocinero) {
      return this.pedidos.filter(p =>
        ['PEDIDO', 'PREPARANDO', 'DEVUELTO'].includes(this.estadoEfectivo(p))
      );
    }
    if (this.esDomiciliario) {
      return this.pedidos.filter(p =>
        this.estadoEfectivo(p) === 'ENTREGADO_DOMICILIARIO'
      );
    }
    return this.pedidos;
  }

  // ── FIX #4: Enviar todos los ítems CREADO a cocina ───────────────────────────
  get hayPedidosParaCocina(): boolean {
    if (this.ventaPagada) return false;
    return this.pedidos.some(p => this.estadoEfectivo(p) === 'CREADO')
      && ['PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO'].includes(this.rol);
  }

  enviarTodosACocina(): void {
    const creados = this.pedidos.filter(p => this.estadoEfectivo(p) === 'CREADO');
    if (creados.length === 0) return;

    this.enviandoTodos = true;
    let pendientes = creados.length;
    let errores    = 0;

    const finalizar = () => {
      pendientes--;
      if (pendientes === 0) {
        this.enviandoTodos = false;
        if (errores === 0) {
          this.toastService.success(`${creados.length} ítem(s) enviados a cocina`);
        } else {
          this.toastService.error(`${creados.length - errores} enviados, ${errores} con error`);
        }
        this.cargarPedidos();
      }
    };

    creados.forEach(p => {
      if (!p.id) { finalizar(); return; }
      this.pedidoService.cambiarEstado(p.id, { estado: 'PEDIDO' }).subscribe({
        next:  () => finalizar(),
        error: () => { errores++; finalizar(); },
      });
    });
  }

  // ── Visibilidad de botones por rol y estado ──────────────────────────────────

  /** CREADO → PEDIDO (Enviar a cocina) */
  puedeEnviarCocina(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    return this.estadoEfectivo(p) === 'CREADO'
      && ['PROPIETARIO','ADMINISTRADOR','CAJERO','MESERO'].includes(this.rol);
  }

  /** PEDIDO → PREPARANDO */
  puedeIniciarPreparacion(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    return this.estadoEfectivo(p) === 'PEDIDO' && this.rol === 'COCINERO';
  }

  /** PREPARANDO → PREPARADO  |  DEVUELTO → PREPARADO (re-preparación) */
  puedeMarcarPreparado(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    const est = this.estadoEfectivo(p);
    return (est === 'PREPARANDO' || est === 'DEVUELTO') && this.rol === 'COCINERO';
  }

  /** PREPARADO → ENTREGADO_CLIENTE  |  ENTREGADO_DOMICILIARIO → ENTREGADO_CLIENTE (solo DOMICILIARIO) */
  puedeEntregarCliente(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    const est = this.estadoEfectivo(p);
    // Flujo normal: listo en cocina → entregado al cliente (mesa / mostrador)
    if (est === 'PREPARADO') {
      return ['PROPIETARIO','ADMINISTRADOR','CAJERO','MESERO','DOMICILIARIO'].includes(this.rol);
    }
    // Flujo domicilio: en reparto → domiciliario confirma entrega al cliente final
    if (est === 'ENTREGADO_DOMICILIARIO') {
      return this.esDomiciliario;
    }
    return false;
  }

  /** PREPARADO → ENTREGADO_DOMICILIARIO */
  puedeEntregarDomiciliario(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    return this.estadoEfectivo(p) === 'PREPARADO'
      && ['PROPIETARIO','ADMINISTRADOR','CAJERO','MESERO'].includes(this.rol);
  }

  /** ENTREGADO_CLIENTE / ENTREGADO_DOMICILIARIO → DEVUELTO */
  puedeDevolver(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    return ['ENTREGADO_CLIENTE','ENTREGADO_DOMICILIARIO'].includes(this.estadoEfectivo(p))
      && ['PROPIETARIO','ADMINISTRADOR','CAJERO','MESERO','DOMICILIARIO'].includes(this.rol);
  }

  /** Cualquier estado excepto CREADO → CANCELADO (con motivo); DEVUELTO también puede cancelarse */
  puedeCancelar(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    const est = this.estadoEfectivo(p);
    return !['CREADO','CANCELADO','DESTRUIDO'].includes(est)
      && ['PROPIETARIO','ADMINISTRADOR','CAJERO','MESERO'].includes(this.rol);
  }

  /** post-PREPARANDO → DESTRUIDO (solo PROPIETARIO / ADMINISTRADOR); DEVUELTO también puede destruirse */
  puedeDestruir(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    const ORDEN: PedidoEstado[] = ['CREADO','PEDIDO','PREPARANDO','PREPARADO',
                                    'ENTREGADO_CLIENTE','ENTREGADO_DOMICILIARIO'];
    const est = this.estadoEfectivo(p);
    // DEVUELTO proviene de ENTREGADO, por lo que ya pasó PREPARANDO
    const pasadoPreparando = ORDEN.indexOf(est) >= ORDEN.indexOf('PREPARANDO')
                             || est === 'DEVUELTO';
    return pasadoPreparando
      && !['CANCELADO','DESTRUIDO'].includes(est)
      && ['PROPIETARIO','ADMINISTRADOR'].includes(this.rol);
  }

  // ── FIX #2: Eliminar físico solo cuando CREADO ───────────────────────────────
  // Permitido para PROPIETARIO, ADMINISTRADOR, CAJERO y MESERO
  puedeEliminar(p: Pedido): boolean {
    if (this.ventaPagada) return false;
    return this.estadoEfectivo(p) === 'CREADO'
      && ['PROPIETARIO','ADMINISTRADOR','CAJERO','MESERO'].includes(this.rol);
  }

  puedeHacerAlgo(p: Pedido): boolean {
    return this.puedeEnviarCocina(p)
      || this.puedeIniciarPreparacion(p)
      || this.puedeMarcarPreparado(p)
      || this.puedeEntregarCliente(p)
      || this.puedeEntregarDomiciliario(p)
      || this.puedeDevolver(p)
      || this.puedeCancelar(p)
      || this.puedeDestruir(p)
      || this.puedeEliminar(p);
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  cambiarEstadoDirecto(pedido: Pedido, estado: PedidoEstado): void {
    if (!pedido.id) return;
    this.ejecutarCambio(pedido.id, { estado });
  }

  /** Abre el modal para estados que requieren motivo */
  abrirModalMotivo(pedido: Pedido, estado: PedidoEstado): void {
    this.modalPedidoId = pedido.id;
    this.modalEstado   = estado;
    this.modalMotivo   = '';
    if (estado === 'CANCELADO') {
      this.modalTitulo = 'Cancelar ítem — ingrese el motivo';
    } else if (estado === 'DESTRUIDO') {
      this.modalTitulo = 'Destruir ítem — ingrese el motivo';
    } else if (estado === 'DEVUELTO') {
      this.modalTitulo = 'Devolver ítem — ingrese el motivo de la devolución';
    }
    this.modalVisible  = true;
  }

  confirmarModal(): void {
    if (!this.modalPedidoId || !this.modalEstado) return;
    if (!this.modalMotivo.trim()) {
      this.toastService.error('El motivo es obligatorio');
      return;
    }
    this.ejecutarCambio(this.modalPedidoId, {
      estado: this.modalEstado,
      motivo: this.modalMotivo.trim(),
    });
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.modalVisible    = false;
    this.modalPedidoId   = undefined;
    this.modalEstado     = undefined;
    this.modalMotivo     = '';
  }

  private ejecutarCambio(id: number, request: CambioEstadoRequest): void {
    this.pedidoService.cambiarEstado(id, request).subscribe({
      next:  () => { this.toastService.success('Estado actualizado'); this.cargarPedidos(); },
      error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'No se pudo cambiar el estado')),
    });
  }

  async eliminarItem(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({
      message: '¿Eliminar este ítem definitivamente? Esta acción no se puede deshacer.',
      type: 'danger',
    });
    if (!ok) return;
    this.pedidoService.eliminar(id).subscribe({
      next:  () => { this.toastService.success('Ítem eliminado'); this.cargarPedidos(); },
      error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'No se pudo eliminar el ítem')),
    });
  }

  // ── Totales ─────────────────────────────────────────────────────────────────

  subtotal(pedido: Pedido): number {
    return (pedido.cantidad ?? 0) * (pedido.producto?.precio ?? 0);
  }

  totalGeneral(): number {
    return this.pedidos
      .filter(p => !['CANCELADO','DESTRUIDO'].includes(this.estadoEfectivo(p)))
      .reduce((acc, p) => acc + this.subtotal(p), 0);
  }

  get totalItems(): number      { return this.pedidosVisibles.length; }
  get itemsActivos(): number    { return this.pedidos.filter(p => !['CANCELADO','DESTRUIDO'].includes(this.estadoEfectivo(p))).length; }
  get itemsCancelados(): number { return this.pedidos.filter(p => this.estadoEfectivo(p) === 'CANCELADO').length; }
  get itemsDestruidos(): number { return this.pedidos.filter(p => this.estadoEfectivo(p) === 'DESTRUIDO').length; }

  // ── Helpers de badge ─────────────────────────────────────────────────────────

  badgeClass(p: Pedido): string {
    switch (this.estadoEfectivo(p)) {
      case 'CREADO':                  return 'spx-ped-badge--creado';
      case 'PEDIDO':                  return 'spx-ped-badge--pedido';
      case 'PREPARANDO':              return 'spx-ped-badge--preparando';
      case 'PREPARADO':               return 'spx-ped-badge--preparado';
      case 'ENTREGADO_CLIENTE':
      case 'ENTREGADO_DOMICILIARIO':  return 'spx-ped-badge--entregado';
      case 'DEVUELTO':                return 'spx-ped-badge--devuelto';
      case 'CANCELADO':               return 'spx-ped-badge--cancelado';
      case 'DESTRUIDO':               return 'spx-ped-badge--destruido';
      default:                        return 'spx-ped-badge--creado';
    }
  }

  badgeLabel(p: Pedido): string {
    switch (this.estadoEfectivo(p)) {
      case 'CREADO':                  return 'Creado';
      case 'PEDIDO':                  return 'En cocina';
      case 'PREPARANDO':              return 'Preparando';
      case 'PREPARADO':               return 'Listo';
      case 'ENTREGADO_CLIENTE':       return 'Entregado';
      case 'ENTREGADO_DOMICILIARIO':  return 'En reparto';
      case 'DEVUELTO':                return 'Devuelto';
      case 'CANCELADO':               return 'Cancelado';
      case 'DESTRUIDO':               return 'Destruido';
      default:                        return 'Creado';
    }
  }

  rowClass(p: Pedido): string {
    const est = this.estadoEfectivo(p);
    if (est === 'CANCELADO' || est === 'DESTRUIDO') return 'spx-ped-row--inactive';
    if (est === 'PREPARADO') return 'spx-ped-row--ready';
    return '';
  }
}
