import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompraService } from '../../services/compra.service';
import { CompraRequest } from '../../interfaces/compra.interface';
import { RestauranteService } from '../../../restaurante/services/restaurante.service';
import { InsumoService } from '../../../insumo/services/insumo.service';
import { Restaurante } from '../../../restaurante/interfaces/restaurante.interface';
import { Insumo } from '../../../insumo/interfaces/insumo.interface';
import { CompraListarPageComponent } from '../compra-listar/compra-listar';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { FormaPagoService } from '../../../forma-pago/services/forma-pago.service';
import { FormaPago } from '../../../forma-pago/interfaces/forma-pago.interface';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-compra-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CompraListarPageComponent],
  templateUrl: './compra-registrar.html',
  styleUrls: [
    '../../../shared/styles/spx-forms.css',
    './compra-registrar.css',
  ],
})
export class CompraRegistrarPageComponent implements OnInit, OnDestroy {
  private readonly fb                 = inject(FormBuilder);
  private readonly compraService      = inject(CompraService);
  private readonly restauranteService = inject(RestauranteService);
  private readonly insumoService      = inject(InsumoService);
  private readonly authService        = inject(AuthService);
  private readonly toastService       = inject(ToastService);
  private readonly formaPagoService   = inject(FormaPagoService);

  @ViewChild(CompraListarPageComponent) listarComponent?: CompraListarPageComponent;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  public restaurantes:             Restaurante[] = [];
  public insumos:                  Insumo[]      = [];
  public formasPago:               FormaPago[]   = [];
  public formaPagoSeleccionadaId:  number | null = null;
  /** true si el usuario es ROOT y puede elegir cualquier restaurante */
  public esRoot: boolean = false;

  /** Control de visibilidad del modal */
  public modalAbierto: boolean = false;

  /** Imagen de soporte / factura (Base64) */
  public soportePreview: string = '';
  public soporteNombre:  string = '';

  abrirModal(): void {
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.quitarSoporte();
  }

  /** Abre el selector de archivo del sistema */
  abrirSelectorSoporte(): void {
    this.fileInput.nativeElement.click();
  }

  /** Lee la imagen y la convierte a Base64 */
  onSoporteSeleccionado(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      this.toastService.error('Solo se permiten archivos de imagen (JPG, PNG, WEBP...)');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.toastService.error('La imagen no debe superar los 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.soportePreview = reader.result as string;
      this.soporteNombre  = archivo.name;
    };
    reader.readAsDataURL(archivo);
  }

  /** Elimina la imagen de soporte seleccionada */
  quitarSoporte(): void {
    this.soportePreview = '';
    this.soporteNombre  = '';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  public myForm: FormGroup = this.fb.group({
    codigo:        ['', [Validators.required, Validators.minLength(2)]],
    restauranteId: [null, [Validators.required]],
    insumoId:      [null, [Validators.required]],
    cantidad:      [null, [Validators.required, Validators.min(0.01)]],
    valorUnidad:   [null, [Validators.required, Validators.min(1)]],
  });

  /** Subtotal calculado en tiempo real */
  get subtotal(): number {
    const q = this.myForm.value.cantidad   ?? 0;
    const p = this.myForm.value.valorUnidad ?? 0;
    return q * p;
  }

  ngOnInit(): void {
    const rol = this.authService.getUserRole();
    this.esRoot = (rol === 'ROOT');

    // Cargar formas de pago siempre
    this.formaPagoService.obtenerActivas().subscribe({ next: (d) => this.formasPago = d });

    if (this.esRoot) {
      // ROOT puede elegir cualquier restaurante
      this.restauranteService.obtenerActivos().subscribe({ next: (d) => this.restaurantes = d });
    } else {
      // PROPIETARIO / ADMINISTRADOR: solo su propio restaurante, autoseleccionado
      const rest = this.authService.getCurrentRestaurante();
      if (rest) {
        this.restaurantes = [rest as unknown as Restaurante];
        this.myForm.patchValue({ restauranteId: rest.id });
        // Cargar insumos del restaurante automáticamente
        this.insumoService.obtenerActivosPorRestaurante(rest.id).subscribe({
          next: (d) => this.insumos = d,
        });
      }
    }
  }

  /** Al cambiar de restaurante, recarga los insumos filtrados */
  onRestauranteChange(): void {
    const rId = this.myForm.value.restauranteId;
    this.insumos = [];
    this.myForm.patchValue({ insumoId: null });
    if (rId) {
      this.insumoService.obtenerActivosPorRestaurante(rId).subscribe({
        next: (d) => this.insumos = d,
      });
    }
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }
    if (!this.formaPagoSeleccionadaId) {
      this.toastService.error('Debe seleccionar una forma de pago.');
      return;
    }

    // Validar saldo suficiente en la forma de pago
    const fp = this.formasPago.find(f => f.id === this.formaPagoSeleccionadaId);
    if (fp && (fp.saldoActual ?? 0) < this.subtotal) {
      this.toastService.error(
        `Saldo insuficiente en "${fp.nombre}". Disponible: $${(fp.saldoActual ?? 0).toLocaleString('es-CO')} — Requerido: $${this.subtotal.toLocaleString('es-CO')}`
      );
      return;
    }

    const v = this.myForm.value;
    const payload: CompraRequest = {
      codigo:         v.codigo,
      valorUnidad:    v.valorUnidad,
      cantidad:       v.cantidad,
      valorTotal:     this.subtotal,
      insumo:         { id: v.insumoId },
      restaurante:    { id: v.restauranteId },
      formaPago:      { id: this.formaPagoSeleccionadaId },
      imagenSoporte:  this.soportePreview || undefined,
      activo:         true,
    };

    this.compraService.crear(payload).subscribe({
      next: () => {
        this.toastService.success('Compra registrada. Stock del insumo actualizado automáticamente.');
        this.cerrarModal();
        // Mantener el restaurante seleccionado para no-ROOT
        const restauranteId = this.esRoot ? null : (this.authService.getRestauranteId() ?? null);
        this.formaPagoSeleccionadaId = null;
        this.myForm.reset({ restauranteId });
        if (!this.esRoot && restauranteId) {
          // Recargar insumos del restaurante
          this.insumoService.obtenerActivosPorRestaurante(restauranteId).subscribe({
            next: (d) => this.insumos = d,
          });
        } else {
          this.insumos = [];
        }
        // Recargar saldos actualizados de formas de pago
        this.formaPagoService.obtenerActivas().subscribe({ next: (d) => this.formasPago = d });
        this.listarComponent?.cargarCompras();
      },
      error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido')),
    });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
