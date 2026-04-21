import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { VentaService } from '../../services/venta.service';
import { VentaRequest } from '../../interfaces/venta.interface';
import { MesaService } from '../../../mesa/services/mesa.service';
import { TipoPedidoService } from '../../../tipo-pedido/services/tipo-pedido.service';
import { AuthService } from '../../../auth/services/auth.service';
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
  private readonly toastService      = inject(ToastService);
  private readonly router            = inject(Router);

  @ViewChild(VentaListarPageComponent) listarComponent?: VentaListarPageComponent;

  public mesas:            Mesa[]      = [];
  public tiposPedido:      TipoPedido[]= [];
  /** IDs de mesas que ya tienen una venta ABIERTA — se excluyen del selector */
  private mesasOcupadasIds: Set<number> = new Set();

  public modalNuevaVenta = false;

  public myForm: FormGroup = this.fb.group({
    tipoPedidoId: [null, [Validators.required]],
    mesaId:       [null],
    observacion:  [''],
  });

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  get esCocinero(): boolean {
    return this.authService.getUserRole() === 'COCINERO';
  }

  /** Oculta el campo mesa cuando el tipo de pedido es Domicilio o Llevar */
  get ocultarMesa(): boolean {
    const id = this.myForm.get('tipoPedidoId')?.value;
    if (!id) return false;
    const tipo = this.tiposPedido.find(t => t.id === +id);
    if (!tipo) return false;
    const nombre = (tipo.nombre ?? '').toUpperCase();
    return nombre.includes('DOMICILIO') || nombre.includes('LLEVAR');
  }

  /** Mesas activas que NO tienen venta abierta en este momento */
  get mesasDisponibles(): Mesa[] {
    return this.mesas.filter(m => !this.mesasOcupadasIds.has(m.id!));
  }

  cargarCatalogos(): void {
    forkJoin({
      mesas:        this.mesaService.obtenerActivos(),
      ventasAbiertas: this.ventaService.obtenerAbiertas(),
      tiposPedido:  this.tipoPedidoService.obtenerActivos(),
    }).subscribe({
      next: ({ mesas, ventasAbiertas, tiposPedido }) => {
        // IDs de mesas con venta abierta asignada
        this.mesasOcupadasIds = new Set(
          ventasAbiertas
            .map(v => v.mesa?.id)
            .filter((id): id is number => id != null)
        );
        this.mesas       = mesas;
        this.tiposPedido = tiposPedido;
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
      tipoPedido:    { id: v.tipoPedidoId },
      usuarioCreador: { id: currentUserId },
      observacion:   v.observacion?.trim() || undefined,
      estado:        'ABIERTA',
      activo:        true,
      ...(v.mesaId ? { mesa: { id: v.mesaId } } : {}),
    };

    this.ventaService.crear(payload).subscribe({
      next: (ventaCreada) => {
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
    this.modalNuevaVenta = true;
  }

  cerrarModalNuevaVenta(): void {
    this.modalNuevaVenta = false;
    this.myForm.reset();
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
