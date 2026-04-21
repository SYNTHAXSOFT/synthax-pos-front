import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { VentaService } from '../../services/venta.service';
import { VentaRequest } from '../../interfaces/venta.interface';
import { MesaService } from '../../../mesa/services/mesa.service';
import { TipoPedidoService } from '../../../tipo-pedido/services/tipo-pedido.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ReservaMesaService } from '../../../reserva-mesa/services/reserva-mesa.service';
import { Mesa } from '../../../mesa/interfaces/mesa.interface';
import { TipoPedido } from '../../../tipo-pedido/interfaces/tipo-pedido.interface';
import { VentaListarPageComponent } from '../venta-listar/venta-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-venta-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, VentaListarPageComponent],
  templateUrl: './venta-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css', './venta-registrar.css'],
})
export class VentaRegistrarPageComponent implements OnInit {
  private readonly fb                = inject(FormBuilder);
  private readonly ventaService      = inject(VentaService);
  private readonly mesaService       = inject(MesaService);
  private readonly tipoPedidoService = inject(TipoPedidoService);
  private readonly authService       = inject(AuthService);
  private readonly reservaService    = inject(ReservaMesaService);
  private readonly toastService      = inject(ToastService);
  private readonly router            = inject(Router);
  private readonly route             = inject(ActivatedRoute);

  @ViewChild(VentaListarPageComponent) listarComponent?: VentaListarPageComponent;

  public mesas:            Mesa[]      = [];
  public tiposPedido:      TipoPedido[]= [];

  /** IDs de mesas con venta ABIERTA — excluidas del selector */
  private mesasOcupadasIds:  Set<number> = new Set();
  /** IDs de mesas con reserva ACTIVA — excluidas del selector (salvo la reserva actual) */
  private mesasReservadasIds: Set<number> = new Set();

  public modalNuevaVenta = false;

  /** Mesa pre-seleccionada al llegar desde el mapa de reservas */
  private pendingMesaId:   number | null = null;
  /** ID de la reserva que se cumple al crear esta venta */
  public  reservaDesdeId: number | null = null;

  public myForm: FormGroup = this.fb.group({
    tipoPedidoId: [null, [Validators.required]],
    mesaId:       [null],
    observacion:  [''],
  });

  ngOnInit(): void {
    // Leer queryParams antes de cargar catálogos
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['mesaId'])    this.pendingMesaId   = +params['mesaId'];
      if (params['reservaId']) this.reservaDesdeId  = +params['reservaId'];
    });
    this.cargarCatalogos();
  }

  get esCocinero(): boolean {
    return this.authService.getUserRole() === 'COCINERO';
  }

  get ocultarMesa(): boolean {
    const id = this.myForm.get('tipoPedidoId')?.value;
    if (!id) return false;
    const tipo = this.tiposPedido.find(t => t.id === +id);
    if (!tipo) return false;
    const nombre = (tipo.nombre ?? '').toUpperCase();
    return nombre.includes('DOMICILIO') || nombre.includes('LLEVAR');
  }

  /**
   * Mesas activas sin venta abierta ni reserva activa.
   * Excepción: si venimos de una reserva, la mesa reservada SÍ aparece
   * (es la que queremos seleccionar).
   */
  get mesasDisponibles(): Mesa[] {
    return this.mesas.filter(m => {
      if (this.mesasOcupadasIds.has(m.id!)) return false;
      if (this.mesasReservadasIds.has(m.id!)) {
        // Permitir solo si es la mesa de la reserva que estamos cumpliendo
        return m.id === this.pendingMesaId;
      }
      return true;
    });
  }

  cargarCatalogos(): void {
    forkJoin({
      mesas:         this.mesaService.obtenerActivos(),
      ventasAbiertas:this.ventaService.obtenerAbiertas(),
      tiposPedido:   this.tipoPedidoService.obtenerActivos(),
      reservas:      this.reservaService.obtenerActivas(),
    }).subscribe({
      next: ({ mesas, ventasAbiertas, tiposPedido, reservas }) => {
        this.mesasOcupadasIds = new Set(
          ventasAbiertas
            .map(v => v.mesa?.id)
            .filter((id): id is number => id != null)
        );
        this.mesasReservadasIds = new Set(
          reservas
            .map(r => r.mesa?.id)
            .filter((id): id is number => id != null)
        );
        this.mesas       = mesas;
        this.tiposPedido = tiposPedido;

        // Auto-abrir modal si venimos del mapa de reservas
        if (this.pendingMesaId && !this.esCocinero) {
          this.myForm.reset();
          this.myForm.patchValue({ mesaId: this.pendingMesaId });
          this.modalNuevaVenta = true;
        }
      },
    });
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const v = this.myForm.value;
    const currentUserId = this.authService.getUserId();

    if (!currentUserId) {
      this.toastService.warning('No se pudo obtener el usuario activo. Por favor inicie sesión nuevamente.');
      return;
    }

    const payload: VentaRequest = {
      tipoPedido:     { id: v.tipoPedidoId },
      usuarioCreador: { id: currentUserId },
      observacion:    v.observacion?.trim() || undefined,
      estado:         'ABIERTA',
      activo:         true,
      ...(v.mesaId ? { mesa: { id: v.mesaId } } : {}),
    };

    this.ventaService.crear(payload).subscribe({
      next: (ventaCreada) => {
        // Si venimos de una reserva, marcarla como cumplida
        if (this.reservaDesdeId) {
          this.reservaService.cumplir(this.reservaDesdeId).subscribe();
        }
        this.cerrarModalNuevaVenta();
        this.router.navigate(['/synthax-pos/pedido/registrar'], { queryParams: { ventaId: ventaCreada.id } });
      },
      error: (err) => {
        console.error('Error:', err);
        this.toastService.error('Error al crear la venta: ' + (err.error?.error || 'Error desconocido'));
      },
    });
  }

  abrirModalNuevaVenta(): void {
    this.myForm.reset();
    this.pendingMesaId  = null;
    this.reservaDesdeId = null;
    this.modalNuevaVenta = true;
  }

  cerrarModalNuevaVenta(): void {
    this.modalNuevaVenta = false;
    this.pendingMesaId   = null;
    this.reservaDesdeId  = null;
    this.myForm.reset();
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
