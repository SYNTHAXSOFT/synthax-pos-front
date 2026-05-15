import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { forkJoin, Observable } from 'rxjs';
import { catchError, map, of, switchMap } from 'rxjs';

import { VentaService }   from '../../services/venta.service';
import { PedidoService }  from '../../../pedido/services/pedido.service';
import { AuthService }    from '../../../auth/services/auth.service';
import { ToastService }   from '../../../shared/services/toast.service';

import { Venta }          from '../../interfaces/venta.interface';
import { Pedido, PedidoEstado } from '../../../pedido/interfaces/pedido.interface';

/**
 * Estados que el cocinero ve en su panel.
 * Solo pedidos que ya fueron enviados a cocina (PEDIDO en adelante).
 * CREADO queda excluido — el mesero/cajero aún no lo ha confirmado.
 */
const ESTADOS_COCINERO: PedidoEstado[] = ['PEDIDO', 'PREPARANDO', 'PREPARADO', 'DEVUELTO'];

/** Estados que mantienen la tarjeta visible (tienen acción pendiente del cocinero) */
const ESTADOS_ACTIVOS: PedidoEstado[] = ['PEDIDO', 'PREPARANDO', 'DEVUELTO'];

export interface TarjetaOrden {
  venta:         Venta;
  pedidos:       Pedido[];     // filtrados por ESTADOS_COCINERO
  pendientes:    number;       // PEDIDO (enviados a cocina, aún sin empezar)
  enPreparacion: number;       // PREPARANDO
  listos:        number;       // PREPARADO
  devueltos:     number;       // DEVUELTO
  minutosEspera: number;       // desde fechaCreacion de la venta
}

@Component({
  selector: 'app-cocinero-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cocinero-dashboard.html',
  styleUrls: ['./cocinero-dashboard.css'],
})
export class CocineroDashboardComponent implements OnInit, OnDestroy {
  private readonly ventaService  = inject(VentaService);
  private readonly pedidoService = inject(PedidoService);
  private readonly authService   = inject(AuthService);
  private readonly toastService  = inject(ToastService);

  tarjetas:    TarjetaOrden[] = [];
  cargando     = true;
  indiceActivo = 0;

  /** ID de pedido cuyo estado se está cambiando (bloqueo de doble clic) */
  cambiandoPedidoId: Set<number> = new Set();

  // ── Notificaciones ────────────────────────────────────────────────────────

  /** IDs de pedidos en estado PEDIDO ya conocidos. Vacío = primera carga. */
  private pedidosConocidos = new Set<number>();
  /** true = primera carga completada, ya no silenciamos las notificaciones */
  private primeraCargaCompleta = false;
  /** Indica si llegan nuevas órdenes en el ciclo actual (para el flash visual) */
  nuevasOrdenes = false;

  /**
   * AudioContext compartido. DEBE crearse y reanudarse dentro de un gesto
   * de usuario (click/touchstart) — restricción de iOS Safari y Android Chrome.
   * Por eso usamos un botón explícito en la UI en lugar de listeners ocultos.
   */
  private audioCtx: AudioContext | null = null;

  /**
   * true = el cocinero tocó el botón y el AudioContext está en estado 'running'.
   * false = sin activar (primer ingreso) o el contexto se suspendió al volver
   *         de segundo plano y el usuario debe volver a tocar el botón.
   */
  sonidoActivo = false;

  // ── Intervalos ────────────────────────────────────────────────────────────

  private intervaloId?: ReturnType<typeof setInterval>;
  private relojId?:    ReturnType<typeof setInterval>;

  /** Fuerza re-render de tiempos de espera cada minuto */
  tick = 0;

  /** Handler guardado para poder eliminar el listener en ngOnDestroy */
  private readonly onVisibilityChange = (): void => {
    // Cuando el navegador vuelve al primer plano, el AudioContext puede haberse
    // suspendido automáticamente. Si ocurre, marcamos sonido como inactivo para
    // que el cocinero vea el botón y lo toque de nuevo (único modo de reanudar).
    if (document.visibilityState === 'visible' && this.audioCtx?.state === 'suspended') {
      this.sonidoActivo = false;
    }
  };

  ngOnInit(): void {
    this.cargar();
    this.intervaloId = setInterval(() => this.cargar(), 15_000);
    this.relojId     = setInterval(() => { this.tick++; }, 60_000);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    if (this.intervaloId) clearInterval(this.intervaloId);
    if (this.relojId)     clearInterval(this.relojId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }

  /**
   * Llamado desde el botón "Activar alertas" en la UI.
   * Al ejecutarse dentro del handler de click, el navegador permite crear
   * y reanudar el AudioContext — único momento válido en iOS/Android.
   */
  activarSonido(): void {
    try {
      const Cls = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Cls) { this.toastService.error('Tu navegador no soporta audio web'); return; }

      if (!this.audioCtx) {
        this.audioCtx = new Cls() as AudioContext;
      }

      const ctx = this.audioCtx;

      const iniciar = () => {
        // Buffer silencioso: desbloquea iOS Safari (debe ir antes del primer oscilador)
        const buf = ctx.createBuffer(1, 1, 22_050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);

        this.sonidoActivo = true;

        // Pitido corto de confirmación: 1 grupo de 3 notas (≈ 0.75 s)
        this.pitidoConfirmacion(ctx);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(iniciar).catch(() => {});
      } else {
        iniciar();
      }
    } catch { /* navegador sin soporte */ }
  }

  private pitidoConfirmacion(ctx: AudioContext): void {
    const beep = (freq: number, inicio: number, dur: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + dur);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime  + inicio + dur + 0.05);
    };
    beep(880,  0.00, 0.18);
    beep(1047, 0.22, 0.18);
    beep(1319, 0.44, 0.28);
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  cargar(): void {
    // Estrategia: ventas abiertas del día → para cada venta sus pedidos activos.
    // Se evita depender de `pedido.venta.id` (excluido del @JsonView List en el backend).
    this.ventaService.obtenerAbiertas()
      .pipe(
        catchError(() => of([] as Venta[])),
        switchMap((ventas) => {
          const ventasHoy = this.filtrarHoy(ventas);
          if (ventasHoy.length === 0) {
            return of({ ventas: ventasHoy, pedidosPorVenta: {} as Record<number, Pedido[]> });
          }
          const requests: Record<number, Observable<Pedido[]>> = {};
          for (const v of ventasHoy) {
            requests[v.id!] = this.pedidoService
              .obtenerActivosPorVenta(v.id!)
              .pipe(catchError(() => of([] as Pedido[])));
          }
          return forkJoin(requests).pipe(
            catchError(() => of({} as Record<number, Pedido[]>)),
            map(pedidosPorVenta => ({ ventas: ventasHoy, pedidosPorVenta }))
          );
        })
      )
      .subscribe({
        next: ({ ventas, pedidosPorVenta }) => {
          this.buildTarjetas(ventas, pedidosPorVenta);
          this.detectarYNotificar();
          if (this.indiceActivo >= this.tarjetas.length) {
            this.indiceActivo = Math.max(0, this.tarjetas.length - 1);
          }
          this.cargando = false;
        },
        error: () => { this.cargando = false; },
      });
  }

  private filtrarHoy(ventas: Venta[]): Venta[] {
    const hoy    = new Date();
    const isoHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    return ventas.filter(v => v.id && (!v.fechaCreacion || v.fechaCreacion.startsWith(isoHoy)));
  }

  private buildTarjetas(ventas: Venta[], pedidosPorVenta: Record<number, Pedido[]>): void {
    const tarjetas: TarjetaOrden[] = [];

    for (const v of ventas) {
      if (!v.id) continue;

      const ps = (pedidosPorVenta[v.id] ?? []).filter(
        p => ESTADOS_COCINERO.includes(p.estado as PedidoEstado)
      );

      const activos = ps.filter(p => ESTADOS_ACTIVOS.includes(p.estado as PedidoEstado));
      if (activos.length === 0) continue;

      tarjetas.push({
        venta:         v,
        pedidos:       ps,
        pendientes:    ps.filter(p => p.estado === 'PEDIDO').length,
        enPreparacion: ps.filter(p => p.estado === 'PREPARANDO').length,
        listos:        ps.filter(p => p.estado === 'PREPARADO').length,
        devueltos:     ps.filter(p => p.estado === 'DEVUELTO').length,
        minutosEspera: this.calcMinutos(v.fechaCreacion),
      });
    }

    tarjetas.sort((a, b) => b.minutosEspera - a.minutosEspera);
    this.tarjetas = tarjetas;
  }

  // ── Detección de nuevas órdenes y notificación ────────────────────────────

  private detectarYNotificar(): void {
    // Recopilar IDs de pedidos en PEDIDO actualmente visibles
    const actuales = new Set<number>();
    for (const t of this.tarjetas) {
      for (const p of t.pedidos) {
        if (p.id && p.estado === 'PEDIDO') actuales.add(p.id);
      }
    }

    // Verificar si hay IDs nuevos que no existían en la carga anterior
    const hayNuevos = [...actuales].some(id => !this.pedidosConocidos.has(id));

    if (hayNuevos && this.primeraCargaCompleta) {
      this.emitirNotificacion();
    }

    // Actualizar el registro de pedidos conocidos
    this.pedidosConocidos     = actuales;
    this.primeraCargaCompleta = true;
  }

  private emitirNotificacion(): void {
    this.reproducirSonido();

    // El banner visual dura lo mismo que el sonido
    this.nuevasOrdenes = true;
    setTimeout(() => { this.nuevasOrdenes = false; }, 6_000);
  }

  /**
   * Alerta de cocina: 6 grupos de 3 pitidos ascendentes (La4 → Do5 → Mi5).
   * Duración total ≈ 6 s. Sin archivos externos — 100 % Web Audio API.
   *
   * Solo se ejecuta si el cocinero activó el sonido con el botón (sonidoActivo).
   * En ese caso el AudioContext ya está en estado 'running' y los osciladores
   * funcionan aunque la llamada no sea desde un gesto del usuario.
   */
  private reproducirSonido(): void {
    // Sin activación explícita del cocinero → silencio (política de móviles)
    if (!this.sonidoActivo || !this.audioCtx) return;

    try {
      const ctx = this.audioCtx;

      const tocar = () => {
        const beep = (freq: number, inicio: number, duracion: number, vol = 0.45) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);

          gain.gain.setValueAtTime(0,   ctx.currentTime + inicio);
          gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + inicio + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);

          osc.start(ctx.currentTime + inicio);
          osc.stop( ctx.currentTime + inicio + duracion + 0.05);
        };

        // 6 grupos × 1 s/grupo ≈ 6 s en total
        const FREQS = [880, 1047, 1319];
        const DURS  = [0.22, 0.22, 0.30];
        const GAPS  = [0.00, 0.26, 0.52];

        for (let g = 0; g < 6; g++) {
          const base = g * 1.0;
          FREQS.forEach((f, i) => beep(f, base + GAPS[i], DURS[i]));
        }
      };

      if (ctx.state === 'suspended') {
        // Contexto suspendido (ej. volvió de segundo plano sin presionar el botón)
        // No podemos llamar resume() aquí porque no es un gesto — marcamos inactivo
        // para que el botón aparezca de nuevo en la UI.
        this.sonidoActivo = false;
      } else {
        tocar();
      }
    } catch { /* sin soporte */ }
  }

  // ── Totales globales (topbar) ─────────────────────────────────────────────

  get totalPendientes():    number { return this.tarjetas.reduce((s, t) => s + t.pendientes,    0); }
  get totalEnPreparacion(): number { return this.tarjetas.reduce((s, t) => s + t.enPreparacion, 0); }
  get totalListos():        number { return this.tarjetas.reduce((s, t) => s + t.listos,        0); }

  // ── Navegación del carrusel ───────────────────────────────────────────────

  anterior(): void {
    if (this.indiceActivo > 0) this.indiceActivo--;
  }
  siguiente(): void {
    if (this.indiceActivo < this.tarjetas.length - 1) this.indiceActivo++;
  }
  irA(i: number): void {
    this.indiceActivo = i;
  }

  // ── Acciones sobre pedidos ────────────────────────────────────────────────

  /** PEDIDO → PREPARANDO */
  empezarPedido(pedido: Pedido, tarjeta: TarjetaOrden): void {
    this.cambiarEstado(pedido, 'PREPARANDO', tarjeta);
  }

  /** PREPARANDO → PREPARADO */
  marcarListo(pedido: Pedido, tarjeta: TarjetaOrden): void {
    this.cambiarEstado(pedido, 'PREPARADO', tarjeta);
  }

  /** DEVUELTO → PREPARANDO */
  retomarDevuelto(pedido: Pedido, tarjeta: TarjetaOrden): void {
    this.cambiarEstado(pedido, 'PREPARANDO', tarjeta);
  }

  /** Cambia todos los pedidos PEDIDO a PREPARANDO */
  empezarTodo(tarjeta: TarjetaOrden): void {
    const pendientes = tarjeta.pedidos.filter(p => p.estado === 'PEDIDO');
    for (const p of pendientes) this.cambiarEstado(p, 'PREPARANDO', tarjeta);
  }

  /** Cambia todos los pedidos PREPARANDO a PREPARADO */
  marcarTodoListo(tarjeta: TarjetaOrden): void {
    const enPrep = tarjeta.pedidos.filter(p => p.estado === 'PREPARANDO');
    for (const p of enPrep) this.cambiarEstado(p, 'PREPARADO', tarjeta);
  }

  private cambiarEstado(pedido: Pedido, nuevoEstado: PedidoEstado, tarjeta: TarjetaOrden): void {
    if (!pedido.id || this.cambiandoPedidoId.has(pedido.id)) return;
    this.cambiandoPedidoId.add(pedido.id);

    const estadoAnterior = pedido.estado;
    pedido.estado = nuevoEstado;
    this.recalcularContadores(tarjeta);

    this.pedidoService.cambiarEstado(pedido.id, { estado: nuevoEstado }).subscribe({
      next: () => {
        this.cambiandoPedidoId.delete(pedido.id!);
        const activos = tarjeta.pedidos.filter(
          p => ESTADOS_ACTIVOS.includes(p.estado as PedidoEstado)
        );
        if (activos.length === 0) {
          setTimeout(() => this.cargar(), 500);
        }
      },
      error: () => {
        pedido.estado = estadoAnterior;
        this.recalcularContadores(tarjeta);
        this.cambiandoPedidoId.delete(pedido.id!);
        this.toastService.error('No se pudo actualizar el estado');
      },
    });
  }

  private recalcularContadores(t: TarjetaOrden): void {
    t.pendientes    = t.pedidos.filter(p => p.estado === 'PEDIDO').length;
    t.enPreparacion = t.pedidos.filter(p => p.estado === 'PREPARANDO').length;
    t.listos        = t.pedidos.filter(p => p.estado === 'PREPARADO').length;
    t.devueltos     = t.pedidos.filter(p => p.estado === 'DEVUELTO').length;
  }

  // ── Helpers de vista ─────────────────────────────────────────────────────

  urgenciaClass(t: TarjetaOrden): string {
    if (t.devueltos > 0)     return 'cki-card--devuelto';
    if (t.pendientes > 0)    return 'cki-card--nuevo';
    if (t.enPreparacion > 0) return 'cki-card--preparando';
    return                          'cki-card--listo';
  }

  badgeClass(estado?: string): string {
    switch (estado) {
      case 'PEDIDO':     return 'cki-badge--nuevo';
      case 'PREPARANDO': return 'cki-badge--prep';
      case 'PREPARADO':  return 'cki-badge--listo';
      case 'DEVUELTO':   return 'cki-badge--devuelto';
      default:           return 'cki-badge--nuevo';
    }
  }

  badgeLabel(estado?: string): string {
    switch (estado) {
      case 'PEDIDO':     return 'Pendiente';
      case 'PREPARANDO': return 'En cocina';
      case 'PREPARADO':  return 'Listo';
      case 'DEVUELTO':   return 'Devuelto';
      default:           return estado ?? '—';
    }
  }

  tipoIcono(tipoPedido?: string): string {
    const n = (tipoPedido ?? '').toUpperCase();
    if (n.includes('DOMICILIO')) return 'fa-solid fa-motorcycle';
    if (n.includes('LLEVAR'))    return 'fa-solid fa-bag-shopping';
    return 'fa-solid fa-utensils';
  }

  fmtTiempo(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  urgenciaLabel(t: TarjetaOrden): string {
    if (t.minutosEspera >= 30) return 'urgente';
    if (t.minutosEspera >= 15) return 'demorado';
    return '';
  }

  private calcMinutos(fecha?: string): number {
    if (!fecha) return 0;
    const ms = Date.now() - new Date(fecha).getTime();
    return Math.floor(ms / 60_000);
  }
}
