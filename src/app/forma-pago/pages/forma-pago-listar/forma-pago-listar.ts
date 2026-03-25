import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormaPagoService } from '../../services/forma-pago.service';
import { FormaPago, MovimientoFormaPago } from '../../interfaces/forma-pago.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-forma-pago-listar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './forma-pago-listar.html',
  styleUrls: ['./forma-pago-listar.css'],
})
export class FormaPagoListarComponent implements OnInit {
  private readonly service     = inject(FormaPagoService);
  private readonly toastService = inject(ToastService);
  private readonly authService  = inject(AuthService);

  formasPago:  FormaPago[]            = [];
  movimientos: MovimientoFormaPago[]  = [];
  cargando = false;

  // ── Modal Nueva Forma de Pago ─────────────────────────────────
  modalNueva   = false;
  guardando    = false;
  nuevaNombre      = '';
  nuevaDescripcion = '';
  nuevaSaldoInicial = 0;

  // ── Modal Ajuste de Saldo ─────────────────────────────────────
  modalAjuste       = false;
  fpAjuste?: FormaPago;
  ajusteNuevoSaldo  = 0;
  ajusteExplicacion = '';
  ajustando         = false;

  // ── Modal Historial ───────────────────────────────────────────
  modalHistorial   = false;
  fpHistorial?: FormaPago;
  cargandoMovs     = false;

  ngOnInit(): void {
    this.cargar();
  }

  get esAdmin(): boolean {
    return this.authService.hasRole(['ROOT', 'PROPIETARIO', 'ADMINISTRADOR']);
  }

  cargar(): void {
    this.cargando = true;
    this.service.obtenerTodas().subscribe({
      next: (d) => { this.formasPago = d; this.cargando = false; },
      error: ()  => { this.cargando = false; },
    });
  }

  // ── Nueva ─────────────────────────────────────────────────────

  abrirModalNueva(): void {
    this.nuevaNombre       = '';
    this.nuevaDescripcion  = '';
    this.nuevaSaldoInicial = 0;
    this.modalNueva        = true;
  }

  cerrarModalNueva(): void { this.modalNueva = false; }

  guardarNueva(): void {
    if (!this.nuevaNombre.trim()) {
      this.toastService.warning('El nombre es obligatorio');
      return;
    }
    this.guardando = true;
    this.service.crear({
      nombre:      this.nuevaNombre.trim(),
      descripcion: this.nuevaDescripcion.trim() || undefined,
      saldoActual: this.nuevaSaldoInicial,
      activo:      true,
    }).subscribe({
      next: () => {
        this.toastService.success('Forma de pago creada');
        this.guardando = false;
        this.cerrarModalNueva();
        this.cargar();
      },
      error: (err) => {
        this.toastService.error(err.error?.error || 'Error al crear');
        this.guardando = false;
      },
    });
  }

  // ── Ajuste de Saldo ───────────────────────────────────────────

  abrirAjuste(fp: FormaPago): void {
    this.fpAjuste         = fp;
    this.ajusteNuevoSaldo = fp.saldoActual ?? 0;
    this.ajusteExplicacion = '';
    this.modalAjuste      = true;
  }

  cerrarAjuste(): void { this.modalAjuste = false; this.fpAjuste = undefined; }

  confirmarAjuste(): void {
    if (!this.ajusteExplicacion.trim()) {
      this.toastService.warning('La explicación es obligatoria');
      return;
    }
    if (!this.fpAjuste?.id) return;
    this.ajustando = true;
    this.service.ajustarSaldo(this.fpAjuste.id, this.ajusteNuevoSaldo, this.ajusteExplicacion.trim())
      .subscribe({
        next: () => {
          this.toastService.success('Saldo ajustado correctamente');
          this.ajustando = false;
          this.cerrarAjuste();
          this.cargar();
        },
        error: (err) => {
          this.toastService.error(err.error?.error || 'Error al ajustar');
          this.ajustando = false;
        },
      });
  }

  // ── Historial ─────────────────────────────────────────────────

  verHistorial(fp: FormaPago): void {
    this.fpHistorial     = fp;
    this.movimientos     = [];
    this.cargandoMovs    = true;
    this.modalHistorial  = true;
    this.service.obtenerMovimientos(fp.id!).subscribe({
      next: (d) => { this.movimientos = d; this.cargandoMovs = false; },
      error: ()  => { this.cargandoMovs = false; },
    });
  }

  cerrarHistorial(): void { this.modalHistorial = false; this.fpHistorial = undefined; }

  // ── Desactivar ────────────────────────────────────────────────

  desactivar(fp: FormaPago): void {
    if (!fp.id) return;
    this.service.desactivar(fp.id).subscribe({
      next: () => { this.toastService.success('Forma de pago desactivada'); this.cargar(); },
      error: (err) => this.toastService.error(err.error?.error || 'Error'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  tipoIcon(tipo?: string): string {
    switch (tipo) {
      case 'VENTA':         return 'fa-solid fa-arrow-up';
      case 'COMPRA':        return 'fa-solid fa-arrow-down';
      case 'AJUSTE_MANUAL': return 'fa-solid fa-sliders';
      default:              return 'fa-solid fa-circle-dot';
    }
  }

  tipoLabel(tipo?: string): string {
    switch (tipo) {
      case 'VENTA':         return 'Venta';
      case 'COMPRA':        return 'Compra';
      case 'AJUSTE_MANUAL': return 'Ajuste manual';
      default:              return tipo ?? '';
    }
  }
}
