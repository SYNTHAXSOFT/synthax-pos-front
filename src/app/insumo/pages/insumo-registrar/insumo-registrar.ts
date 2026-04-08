import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InsumoService } from '../../services/insumo.service';
import { InsumoRequest } from '../../interfaces/insumo.interface';
import { RestauranteService } from '../../../restaurante/services/restaurante.service';
import { Restaurante } from '../../../restaurante/interfaces/restaurante.interface';
import { MEDIDAS_INSUMO } from '../../../utils/constantes-utils';
import { InsumoListarPageComponent } from '../insumo-listar/insumo-listar';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-insumo-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InsumoListarPageComponent],
  templateUrl: './insumo-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class InsumoRegistrarPageComponent implements OnInit, OnDestroy {
  private readonly fb                 = inject(FormBuilder);
  private readonly insumoService      = inject(InsumoService);
  private readonly restauranteService = inject(RestauranteService);
  private readonly authService        = inject(AuthService);
  private readonly toastService       = inject(ToastService);

  @ViewChild(InsumoListarPageComponent) listarComponent?: InsumoListarPageComponent;

  public editando: boolean = false;
  private insumoId?: number;
  public restaurantes: Restaurante[] = [];
  public readonly medidas = MEDIDAS_INSUMO;
  public esRoot: boolean = false;
  public modalAbierto: boolean = false;

  public myForm: FormGroup = this.fb.group({
    codigo:        ['', [Validators.required, Validators.minLength(2)]],
    descripcion:   ['', [Validators.required]],
    stock:         [0,  [Validators.min(0)]],
    medida:        ['UNIDAD', [Validators.required]],
    restauranteId: [null, [Validators.required]],
    activo:        [true],
  });

  ngOnInit(): void {
    const rol = this.authService.getUserRole();
    this.esRoot = (rol === 'ROOT');

    if (this.esRoot) {
      this.restauranteService.obtenerActivos().subscribe({ next: (d) => this.restaurantes = d });
    } else {
      const rest = this.authService.getCurrentRestaurante();
      if (rest) {
        this.restaurantes = [rest as unknown as Restaurante];
        this.myForm.patchValue({ restauranteId: rest.id });
      }
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  abrirModal(): void {
    this.editando = false;
    this.insumoId = undefined;
    const restauranteId = this.esRoot ? null : (this.authService.getRestauranteId() ?? null);
    this.myForm.reset({ stock: 0, medida: 'UNIDAD', activo: true, restauranteId });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(id: number): void {
    this.insumoService.obtenerPorId(id).subscribe({
      next: (i) => {
        this.editando = true;
        this.insumoId = id;
        this.myForm.patchValue({
          codigo:        i.codigo,
          descripcion:   i.descripcion,
          stock:         i.stock,
          medida:        i.medida,
          restauranteId: i.restaurante?.id ?? null,
          activo:        i.activo,
        });
        this.modalAbierto = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => this.toastService.error('Error al cargar el insumo'),
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.editando = false;
    this.insumoId = undefined;
    const restauranteId = this.esRoot ? null : (this.authService.getRestauranteId() ?? null);
    this.myForm.reset({ stock: 0, medida: 'UNIDAD', activo: true, restauranteId });
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }
    const v = this.myForm.value;
    const payload: InsumoRequest = {
      codigo:      v.codigo,
      descripcion: v.descripcion,
      stock:       v.stock ?? 0,
      medida:      v.medida,
      restaurante: { id: v.restauranteId },
      activo:      v.activo,
    };

    if (this.editando && this.insumoId) {
      this.insumoService.actualizar(this.insumoId, payload).subscribe({
        next: () => {
          this.toastService.success('Insumo actualizado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarInsumos();
        },
        error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.insumoService.crear(payload).subscribe({
        next: () => {
          this.toastService.success('Insumo creado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarInsumos();
        },
        error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido')),
      });
    }
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
