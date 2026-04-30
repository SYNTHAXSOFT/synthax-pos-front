import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CompraService } from '../../services/compra.service';
import { CompraOrdenRequest } from '../../interfaces/compra.interface';
import { RestauranteService } from '../../../restaurante/services/restaurante.service';
import { InsumoService } from '../../../insumo/services/insumo.service';
import { Restaurante } from '../../../restaurante/interfaces/restaurante.interface';
import { Insumo } from '../../../insumo/interfaces/insumo.interface';
import { CompraListarPageComponent } from '../compra-listar/compra-listar';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { FormaPagoService } from '../../../forma-pago/services/forma-pago.service';
import { FormaPago } from '../../../forma-pago/interfaces/forma-pago.interface';

@Component({
  selector: 'app-compra-registrar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CompraListarPageComponent],
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
  public esRoot:                   boolean       = false;
  public guardando:                boolean       = false;

  /** Control de visibilidad del modal */
  public modalAbierto: boolean = false;

  // ── Autocomplete de insumo por línea ──────────────────────────────────────
  public insumosBusqueda:       string[]          = [''];
  public mostrarDropdownInsumo: boolean[]         = [false];
  public insumoSeleccionado:    (Insumo | null)[] = [null];

  /** Imagen de soporte / factura (Base64) */
  public soportePreview: string = '';
  public soporteNombre:  string = '';

  // ── Form principal ────────────────────────────────────────────────────────

  public myForm: FormGroup = this.fb.group({
    codigo:             ['', [Validators.required, Validators.minLength(2)]],
    restauranteId:      [null, [Validators.required]],
    descripcion:        [''],
    descuentoAdicional: [0, [Validators.min(0)]],
    items:              this.fb.array([this.crearLineaForm()]),
  });

  // ── FormArray helpers ─────────────────────────────────────────────────────

  get items(): FormArray { return this.myForm.get('items') as FormArray; }

  private crearLineaForm(): FormGroup {
    return this.fb.group({
      insumoId:      [null, [Validators.required]],
      cantidad:      [null, [Validators.required, Validators.min(0.01)]],
      valorUnidad:   [null, [Validators.required, Validators.min(0)]],
      valorAgregado: [0,    [Validators.min(0)]],
      descuento:     [0,    [Validators.min(0)]],
    });
  }

  agregarLinea(): void {
    this.items.push(this.crearLineaForm());
    this.insumosBusqueda.push('');
    this.mostrarDropdownInsumo.push(false);
    this.insumoSeleccionado.push(null);
  }

  quitarLinea(i: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(i);
      this.insumosBusqueda.splice(i, 1);
      this.mostrarDropdownInsumo.splice(i, 1);
      this.insumoSeleccionado.splice(i, 1);
    }
  }

  lineaCtrl(i: number, field: string): AbstractControl {
    return this.items.at(i).get(field)!;
  }

  // ── Cálculos por línea y totales ──────────────────────────────────────────

  /** Subtotal bruto de la línea: cantidad × valorUnidad */
  subtotalLinea(i: number): number {
    const v = this.items.at(i).value;
    return (v.cantidad ?? 0) * (v.valorUnidad ?? 0);
  }

  /** Total neto de la línea = subtotal + valorAgregado − descuento */
  totalLinea(i: number): number {
    const v = this.items.at(i).value;
    const sub = this.subtotalLinea(i);
    return Math.max(0, sub + (v.valorAgregado ?? 0) - (v.descuento ?? 0));
  }

  /** Suma de todos los totales netos de línea */
  get subtotalGeneral(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) total += this.totalLinea(i);
    return total;
  }

  get descuentoAdicionalVal(): number {
    return this.myForm.value.descuentoAdicional ?? 0;
  }

  /** Total final: subtotalGeneral − descuentoAdicional */
  get totalFinal(): number {
    return Math.max(0, this.subtotalGeneral - this.descuentoAdicionalVal);
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    const rol = this.authService.getUserRole();
    this.esRoot = (rol === 'ROOT');

    this.formaPagoService.obtenerActivas().subscribe({ next: d => this.formasPago = d });

    if (this.esRoot) {
      this.restauranteService.obtenerActivos().subscribe({ next: d => this.restaurantes = d });
    } else {
      const rest = this.authService.getCurrentRestaurante();
      if (rest) {
        this.restaurantes = [rest as unknown as Restaurante];
        this.myForm.patchValue({ restauranteId: rest.id });
        this.insumoService.obtenerActivosPorRestaurante(rest.id).subscribe({
          next: d => this.insumos = d,
        });
      }
    }
  }

  ngOnDestroy(): void { document.body.style.overflow = ''; }

  // ── Modal ─────────────────────────────────────────────────────────────────

  abrirModal(): void {
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.quitarSoporte();
  }

  // ── Restaurante / Insumos ─────────────────────────────────────────────────

  onRestauranteChange(): void {
    const rId = this.myForm.value.restauranteId;
    this.insumos = [];
    for (let i = 0; i < this.items.length; i++) {
      this.items.at(i).patchValue({ insumoId: null });
      this.insumoSeleccionado[i]    = null;
      this.insumosBusqueda[i]       = '';
      this.mostrarDropdownInsumo[i] = false;
    }
    if (rId) {
      this.insumoService.obtenerActivosPorRestaurante(rId).subscribe({
        next: d => this.insumos = d,
      });
    }
  }

  // ── Guardado ──────────────────────────────────────────────────────────────

  onSave(): void {
    this.myForm.markAllAsTouched();
    this.items.controls.forEach(c => (c as FormGroup).markAllAsTouched());

    if (this.myForm.invalid) return;
    if (!this.formaPagoSeleccionadaId) {
      this.toastService.error('Debe seleccionar una forma de pago.');
      return;
    }

    // Validar saldo
    const fp = this.formasPago.find(f => f.id === this.formaPagoSeleccionadaId);
    if (fp && (fp.saldoActual ?? 0) < this.totalFinal) {
      this.toastService.error(
        `Saldo insuficiente en "${fp.nombre}". ` +
        `Disponible: $${(fp.saldoActual ?? 0).toLocaleString('es-CO')} — ` +
        `Requerido: $${this.totalFinal.toLocaleString('es-CO')}`
      );
      return;
    }

    const v       = this.myForm.value;
    const subTotal = this.subtotalGeneral;

    // Distribuir el descuento adicional proporcionalmente entre líneas
    const lineas = this.items.controls.map((_, i) => {
      const lineaTotal = this.totalLinea(i);
      const ratio      = subTotal > 0 ? lineaTotal / subTotal : 1 / this.items.length;
      const valorFinal = Math.max(0, lineaTotal - this.descuentoAdicionalVal * ratio);
      const item       = this.items.at(i).value;

      return {
        insumoId:      item.insumoId,
        cantidad:      item.cantidad,
        valorUnidad:   item.valorUnidad,
        valorAgregado: item.valorAgregado ?? 0,
        descuento:     item.descuento     ?? 0,
        valorTotal:    valorFinal,
      };
    });

    const orden: CompraOrdenRequest = {
      codigo:        v.codigo,
      restauranteId: v.restauranteId,
      formaPagoId:   this.formaPagoSeleccionadaId!,
      descripcion:   v.descripcion?.trim() || undefined,
      imagenSoporte: this.soportePreview   || undefined,
      lineas,
    };

    this.guardando = true;
    this.compraService.crearOrden(orden).subscribe({
      next: (result) => {
        const n = result.length;
        this.toastService.success(
          `Orden registrada con ${n} ${n === 1 ? 'insumo' : 'insumos'}. Stock e insumos actualizados.`
        );
        this.guardando = false;
        this._resetForm();
        this.cerrarModal();
        this.formaPagoService.obtenerActivas().subscribe({ next: d => this.formasPago = d });
        this.listarComponent?.cargarCompras();
      },
      error: err => {
        this.guardando = false;
        this.toastService.error('Error: ' + (err.error?.message || err.error?.error || 'No se pudo registrar la orden'));
      },
    });
  }

  private _resetForm(): void {
    const restauranteId = this.esRoot ? null : (this.authService.getRestauranteId() ?? null);
    this.formaPagoSeleccionadaId = null;
    while (this.items.length > 0) this.items.removeAt(0);
    this.items.push(this.crearLineaForm());
    this.insumosBusqueda       = [''];
    this.mostrarDropdownInsumo = [false];
    this.insumoSeleccionado    = [null];
    this.myForm.reset({
      restauranteId,
      descuentoAdicional: 0,
    });
    if (!this.esRoot && restauranteId) {
      this.insumoService.obtenerActivosPorRestaurante(restauranteId).subscribe({
        next: d => this.insumos = d,
      });
    } else {
      this.insumos = [];
    }
  }

  // ── Métodos autocomplete insumo ───────────────────────────────────────────

  insumosFiltrados(i: number): Insumo[] {
    const term = (this.insumosBusqueda[i] ?? '').trim().toLowerCase();
    if (!term) return this.insumos.slice(0, 8);
    return this.insumos.filter(ins =>
      (ins.codigo        ?? '').toLowerCase().includes(term) ||
      (ins.descripcion   ?? '').toLowerCase().includes(term)
    ).slice(0, 8);
  }

  onInsumoBusquedaChange(i: number, value: string): void {
    this.insumosBusqueda[i]       = value;
    this.mostrarDropdownInsumo[i] = value.trim().length > 0;
    if (this.insumoSeleccionado[i]) {
      this.insumoSeleccionado[i] = null;
      this.items.at(i).patchValue({ insumoId: null });
    }
  }

  seleccionarInsumo(i: number, ins: Insumo): void {
    this.insumoSeleccionado[i]    = ins;
    this.insumosBusqueda[i]       = '';
    this.mostrarDropdownInsumo[i] = false;
    this.items.at(i).patchValue({ insumoId: ins.id });
  }

  limpiarInsumo(i: number): void {
    this.insumoSeleccionado[i]    = null;
    this.insumosBusqueda[i]       = '';
    this.mostrarDropdownInsumo[i] = false;
    this.items.at(i).patchValue({ insumoId: null });
  }

  // ── Imagen soporte ────────────────────────────────────────────────────────

  abrirSelectorSoporte(): void { this.fileInput.nativeElement.click(); }

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

  quitarSoporte(): void {
    this.soportePreview = '';
    this.soporteNombre  = '';
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  // ── Validación ────────────────────────────────────────────────────────────

  isValidField(field: string): boolean | null {
    const ctrl = this.myForm.controls[field];
    return ctrl?.errors && ctrl?.touched ? true : null;
  }

  isValidLineaField(i: number, field: string): boolean | null {
    const ctrl = this.items.at(i).get(field);
    return ctrl?.errors && ctrl?.touched ? true : null;
  }
}
