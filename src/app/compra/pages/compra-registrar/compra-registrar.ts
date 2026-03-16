import { Component, inject, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-compra-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CompraListarPageComponent],
  templateUrl: './compra-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class CompraRegistrarPageComponent implements OnInit {
  private readonly fb                 = inject(FormBuilder);
  private readonly compraService      = inject(CompraService);
  private readonly restauranteService = inject(RestauranteService);
  private readonly insumoService      = inject(InsumoService);
  private readonly authService        = inject(AuthService);
  private readonly toastService       = inject(ToastService);

  @ViewChild(CompraListarPageComponent) listarComponent?: CompraListarPageComponent;

  public restaurantes: Restaurante[] = [];
  public insumos:      Insumo[]      = [];
  /** true si el usuario es ROOT y puede elegir cualquier restaurante */
  public esRoot: boolean = false;

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
    const v = this.myForm.value;
    const payload: CompraRequest = {
      codigo:      v.codigo,
      valorUnidad: v.valorUnidad,
      cantidad:    v.cantidad,
      valorTotal:  this.subtotal,
      insumo:      { id: v.insumoId },
      restaurante: { id: v.restauranteId },
      activo:      true,
    };

    this.compraService.crear(payload).subscribe({
      next: () => {
        this.toastService.success('Compra registrada. Stock del insumo actualizado automáticamente.');
        // Mantener el restaurante seleccionado para no-ROOT
        const restauranteId = this.esRoot ? null : (this.authService.getRestauranteId() ?? null);
        this.myForm.reset({ restauranteId });
        if (!this.esRoot && restauranteId) {
          // Recargar insumos del restaurante
          this.insumoService.obtenerActivosPorRestaurante(restauranteId).subscribe({
            next: (d) => this.insumos = d,
          });
        } else {
          this.insumos = [];
        }
        this.listarComponent?.cargarCompras();
      },
      error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido')),
    });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
