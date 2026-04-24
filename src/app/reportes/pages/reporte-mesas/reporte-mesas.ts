import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MesaService } from '../../../mesa/services/mesa.service';
import { VentaService } from '../../../venta/services/venta.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ReservaMesaService } from '../../../reserva-mesa/services/reserva-mesa.service';
import { ClienteService } from '../../../cliente/services/cliente.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Mesa } from '../../../mesa/interfaces/mesa.interface';
import { Venta } from '../../../venta/interfaces/venta.interface';
import { ReservaMesa, ReservaMesaRequest } from '../../../reserva-mesa/interfaces/reserva-mesa.interface';
import { Cliente } from '../../../cliente/interfaces/cliente.interface';

export interface MesaConEstado {
  mesa:         Mesa;
  ocupada:      boolean;
  reservada:    boolean;
  ventaAbierta: Venta | null;
  reserva:      ReservaMesa | null;
}

@Component({
  selector: 'app-reporte-mesas',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-mesas.html',
  styleUrls: ['./reporte-mesas.css'],
})
export class ReporteMesasComponent implements OnInit {
  private mesaService    = inject(MesaService);
  private ventaService   = inject(VentaService);
  private reservaService = inject(ReservaMesaService);
  private clienteService = inject(ClienteService);
  private authService    = inject(AuthService);
  private toastService   = inject(ToastService);
  private router         = inject(Router);

  cargando = true;
  ultimaActualizacion: Date | null = null;

  mesas:    Mesa[]        = [];
  ventas:   Venta[]       = [];
  reservas: ReservaMesa[] = [];

  filtroBusqueda = '';
  filtroEstado: 'todas' | 'ocupada' | 'reservada' | 'disponible' = 'todas';

  // ── Modal reserva ─────────────────────────────────────────────────────────
  modalReserva        = false;
  mesaEnReserva: Mesa | null = null;
  guardandoReserva    = false;
  formReserva = {
    nombreCliente: '',
    telefono:      '',
    fechaReserva:  '',
    numPersonas:   2,
    observacion:   '',
  };

  // ── Búsqueda de cliente en el modal de reserva ────────────────────────────
  clientesDisponibles:         Cliente[]     = [];
  clienteBusquedaReserva:      string        = '';
  clienteSeleccionadoReserva:  Cliente | null = null;
  mostrarDropdownReserva:      boolean       = false;

  // Mini-form crear cliente nuevo
  mostrarFormNuevoClienteReserva = false;
  guardandoClienteReserva        = false;
  nuevoClienteReserva = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };

  get clientesFiltradosReserva(): Cliente[] {
    const term = this.clienteBusquedaReserva.trim().toLowerCase();
    if (!term) return this.clientesDisponibles.slice(0, 6);
    return this.clientesDisponibles.filter(c =>
      c.cedula?.toLowerCase().includes(term) ||
      c.nombre?.toLowerCase().includes(term) ||
      c.apellido?.toLowerCase().includes(term)
    ).slice(0, 6);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    forkJoin({
      mesas:    this.mesaService.obtenerActivos(),
      ventas:   this.ventaService.obtenerAbiertas(),
      reservas: this.reservaService.obtenerActivas(),
    }).subscribe({
      next: ({ mesas, ventas, reservas }) => {
        this.mesas    = mesas;
        this.ventas   = ventas;
        this.reservas = reservas;
        this.ultimaActualizacion = new Date();
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  // ── Estado compuesto de cada mesa ─────────────────────────────────────────

  get mesasConEstado(): MesaConEstado[] {
    return this.mesas.map(mesa => {
      const ventaAbierta = this.ventas.find(
        v => v.mesa?.id === mesa.id && v.estado === 'ABIERTA'
      ) ?? null;
      const reserva = this.reservas.find(
        r => r.mesa?.id === mesa.id && r.estado === 'ACTIVA'
      ) ?? null;
      return {
        mesa,
        ocupada:   ventaAbierta !== null,
        reservada: reserva !== null && ventaAbierta === null,
        ventaAbierta,
        reserva,
      };
    });
  }

  get mesasFiltradas(): MesaConEstado[] {
    let r = this.mesasConEstado;

    if (this.filtroBusqueda) {
      const q = this.filtroBusqueda.toLowerCase();
      r = r.filter(m =>
        m.mesa.nombre?.toLowerCase().includes(q) ||
        m.mesa.codigo?.toLowerCase().includes(q)
      );
    }

    if (this.filtroEstado === 'ocupada')   r = r.filter(m => m.ocupada);
    if (this.filtroEstado === 'reservada') r = r.filter(m => m.reservada);
    if (this.filtroEstado === 'disponible')r = r.filter(m => !m.ocupada && !m.reservada);

    return r;
  }

  // ── Métricas ──────────────────────────────────────────────────────────────

  get totalOcupadas():   number { return this.mesasConEstado.filter(m => m.ocupada).length; }
  get totalReservadas(): number { return this.mesasConEstado.filter(m => m.reservada).length; }
  get totalDisponibles():number { return this.mesasConEstado.filter(m => !m.ocupada && !m.reservada).length; }

  // ── Permisos ──────────────────────────────────────────────────────────────

  get puedeReservar(): boolean {
    const rol = this.authService.getUserRole() ?? '';
    return ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO'].includes(rol);
  }

  // ── Acciones reserva ─────────────────────────────────────────────────────

  abrirModalReserva(mesa: Mesa): void {
    this.mesaEnReserva = mesa;
    // Prellenar fecha/hora con "ahora + 1 hora" como valor por defecto
    const ahora = new Date();
    ahora.setHours(ahora.getHours() + 1, 0, 0, 0);
    this.formReserva = {
      nombreCliente: '',
      telefono:      '',
      fechaReserva:  this.toDatetimeLocal(ahora),
      numPersonas:   2,
      observacion:   '',
    };
    // Reset búsqueda de cliente
    this.clienteSeleccionadoReserva = null;
    this.clienteBusquedaReserva     = '';
    this.mostrarDropdownReserva     = false;
    // Carga lazy de clientes
    if (this.clientesDisponibles.length === 0) {
      this.clienteService.listar().subscribe({
        next: (cs) => { this.clientesDisponibles = cs; },
      });
    }
    this.modalReserva = true;
  }

  cerrarModalReserva(): void {
    this.modalReserva                    = false;
    this.mesaEnReserva                   = null;
    this.guardandoReserva                = false;
    this.clienteSeleccionadoReserva      = null;
    this.clienteBusquedaReserva          = '';
    this.mostrarDropdownReserva          = false;
    this.mostrarFormNuevoClienteReserva  = false;
    this.guardandoClienteReserva         = false;
    this.nuevoClienteReserva             = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };
  }

  onClienteReservaBusquedaChange(): void {
    this.mostrarDropdownReserva = this.clienteBusquedaReserva.trim().length > 0;
    if (this.clienteSeleccionadoReserva) {
      this.clienteSeleccionadoReserva = null;
    }
  }

  seleccionarClienteReserva(c: Cliente): void {
    this.clienteSeleccionadoReserva  = c;
    this.clienteBusquedaReserva      = '';
    this.mostrarDropdownReserva      = false;
    this.formReserva.nombreCliente   = `${c.nombre} ${c.apellido}`;
    this.formReserva.telefono        = c.telefono ?? '';
  }

  limpiarClienteReserva(): void {
    this.clienteSeleccionadoReserva  = null;
    this.clienteBusquedaReserva      = '';
    this.mostrarDropdownReserva      = false;
    this.formReserva.nombreCliente   = '';
    this.formReserva.telefono        = '';
  }

  abrirFormNuevoClienteReserva(): void {
    this.mostrarFormNuevoClienteReserva = true;
    this.mostrarDropdownReserva         = false;
    this.nuevoClienteReserva = {
      nombre: '', apellido: '', cedula: this.clienteBusquedaReserva.trim(),
      email: '', telefono: '',
    };
  }

  cerrarFormNuevoClienteReserva(): void {
    this.mostrarFormNuevoClienteReserva = false;
    this.guardandoClienteReserva        = false;
    this.nuevoClienteReserva            = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };
  }

  guardarNuevoClienteReserva(): void {
    const nc = this.nuevoClienteReserva;
    if (!nc.nombre.trim() || !nc.apellido.trim() || !nc.cedula.trim() || !nc.email.trim()) {
      this.toastService.warning('Nombre, apellido, cédula y email son obligatorios.');
      return;
    }
    this.guardandoClienteReserva = true;
    const payload: Cliente = {
      nombre:   nc.nombre.trim(),
      apellido: nc.apellido.trim(),
      cedula:   nc.cedula.trim(),
      email:    nc.email.trim(),
      telefono: nc.telefono.trim() || undefined,
      activo:   true,
    };
    this.clienteService.crear(payload).subscribe({
      next: (creado) => {
        this.clientesDisponibles = [creado, ...this.clientesDisponibles];
        this.seleccionarClienteReserva(creado);
        this.cerrarFormNuevoClienteReserva();
        this.toastService.success(`Cliente "${creado.nombre} ${creado.apellido}" creado y seleccionado`);
      },
      error: (err) => {
        this.toastService.error('Error al crear cliente: ' + (err.error?.error ?? 'Error desconocido'));
        this.guardandoClienteReserva = false;
      },
    });
  }

  confirmarReserva(): void {
    if (!this.mesaEnReserva) return;
    if (!this.formReserva.nombreCliente.trim()) {
      this.toastService.warning('El nombre del cliente es obligatorio.');
      return;
    }
    if (!this.formReserva.fechaReserva) {
      this.toastService.warning('La fecha y hora de la reserva son obligatorias.');
      return;
    }

    this.guardandoReserva = true;

    const payload: ReservaMesaRequest = {
      mesa:          { id: this.mesaEnReserva.id! },
      nombreCliente: this.formReserva.nombreCliente.trim(),
      telefono:      this.formReserva.telefono.trim() || undefined,
      // datetime-local entrega YYYY-MM-DDTHH:mm (sin segundos) — el backend necesita segundos
      fechaReserva:  this.formReserva.fechaReserva.length === 16
                       ? this.formReserva.fechaReserva + ':00'
                       : this.formReserva.fechaReserva,
      numPersonas:   this.formReserva.numPersonas > 0 ? this.formReserva.numPersonas : undefined,
      observacion:   this.formReserva.observacion.trim() || undefined,
    };

    this.reservaService.crear(payload).subscribe({
      next: () => {
        this.toastService.success(`Mesa "${this.mesaEnReserva!.nombre}" reservada correctamente`);
        this.cerrarModalReserva();
        this.cargar();
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error ?? 'No se pudo crear la reserva'));
        this.guardandoReserva = false;
      },
    });
  }

  liberarReserva(reservaId: number): void {
    this.reservaService.cancelar(reservaId).subscribe({
      next: () => {
        this.toastService.success('Mesa liberada correctamente');
        this.cargar();
      },
      error: (err) => {
        this.toastService.error('Error al liberar: ' + (err.error?.error ?? 'Error desconocido'));
      },
    });
  }

  /** Navega a /venta con la mesa pre-seleccionada y marca la reserva como cumplida al crear la venta. */
  abrirVentaDesdeReserva(item: MesaConEstado): void {
    this.router.navigate(['/synthax-pos/venta'], {
      queryParams: {
        mesaId:    item.mesa.id,
        reservaId: item.reserva?.id ?? null,
      },
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroEstado   = 'todas';
  }

  // ── Helpers de formato ────────────────────────────────────────────────────

  fmt(n?: number): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
  }

  fmtHora(s?: string | Date): string {
    if (!s) return '—';
    return new Date(s as string).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  fmtFechaHora(s?: string): string {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  getMesaNum(mesa: Mesa): string {
    const match = (mesa.nombre ?? mesa.codigo ?? '').match(/\d+/);
    return match ? match[0] : mesa.codigo?.slice(-2) ?? '?';
  }

  private toDatetimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
