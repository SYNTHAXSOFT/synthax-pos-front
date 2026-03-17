import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ProductoService } from '../../services/producto.service';
import { DetalleProductoService } from '../../services/detalle-producto.service';
import { InsumoService } from '../../../insumo/services/insumo.service';
import { Producto } from '../../interfaces/producto.interface';
import { LineaReceta } from '../../interfaces/detalle-producto.interface';
import { Insumo } from '../../../insumo/interfaces/insumo.interface';
import { ProductoListarPageComponent } from '../producto-listar/producto-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-producto-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ProductoListarPageComponent],
  templateUrl: './producto-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class ProductoRegistrarPageComponent implements OnInit {
  private readonly fb                    = inject(FormBuilder);
  private readonly productoService       = inject(ProductoService);
  private readonly detalleProductoService = inject(DetalleProductoService);
  private readonly insumoService         = inject(InsumoService);
  private readonly route                 = inject(ActivatedRoute);
  private readonly toastService          = inject(ToastService);

  @ViewChild(ProductoListarPageComponent) listarComponent?: ProductoListarPageComponent;

  public editando: boolean = false;
  private productoId?: number;

  /** Vista previa de la imagen seleccionada (Base64 o URL existente al editar) */
  public imagenPreview: string | null = null;

  // ── Receta / Insumos ──────────────────────────────────────────────────────
  /** Lista de insumos activos disponibles para agregar a la receta */
  public insumos: Insumo[] = [];
  /** Líneas de receta actuales del producto */
  public receta: LineaReceta[] = [];
  /** Insumo seleccionado en el selector */
  public insumoSeleccionadoId: number | null = null;
  /** Cantidad del insumo a agregar */
  public cantidadInsumo: number = 1;
  public guardandoReceta: boolean = false;

  public myForm: FormGroup = this.fb.group({
    codigo:      ['', [Validators.required, Validators.minLength(2)]],
    nombre:      ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required]],
    precio:      [null, [Validators.required, Validators.min(0)]],
    imagen:      [''],
    activo:      [true],
  });

  ngOnInit(): void {
    // Cargar insumos activos disponibles
    this.insumoService.obtenerActivos().subscribe({
      next: (data) => (this.insumos = data),
      error: (err) => console.error('Error al cargar insumos:', err),
    });

    // Si viene con queryParam ?id=X cargamos el producto para editar
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.editando = true;
        this.productoId = +id;

        this.productoService.obtenerPorId(this.productoId).subscribe({
          next: (p) => {
            this.myForm.patchValue(p);
            if (p.imagen) this.imagenPreview = p.imagen;
          },
          error: (err) => console.error('Error al cargar producto:', err),
        });

        // Cargar receta existente
        this.detalleProductoService.obtenerPorProducto(this.productoId).subscribe({
          next: (detalles) => {
            this.receta = detalles
              .filter(d => d.insumo)
              .map(d => ({
                insumo: d.insumo!,
                cantidad: d.cantidad,
                detalleId: d.id,
              }));
          },
          error: (err) => console.error('Error al cargar receta:', err),
        });
      }
    });
  }

  // ── Imagen ────────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.toastService.error('Por favor selecciona un archivo de imagen válido');
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.error('La imagen no debe superar los 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imagenPreview = base64;
      this.myForm.patchValue({ imagen: base64 });
    };
    reader.readAsDataURL(file);
  }

  quitarImagen(): void {
    this.imagenPreview = null;
    this.myForm.patchValue({ imagen: '' });
  }

  // ── Receta ────────────────────────────────────────────────────────────────

  get insumoSeleccionado(): Insumo | null {
    if (!this.insumoSeleccionadoId) return null;
    return this.insumos.find(i => i.id === +this.insumoSeleccionadoId!) ?? null;
  }

  agregarInsumo(): void {
    if (!this.insumoSeleccionadoId) {
      this.toastService.error('Selecciona un insumo');
      return;
    }
    if (!this.cantidadInsumo || this.cantidadInsumo <= 0) {
      this.toastService.error('La cantidad debe ser mayor a 0');
      return;
    }

    const insumo = this.insumos.find(i => i.id === +this.insumoSeleccionadoId!);
    if (!insumo) return;

    // Evitar duplicados — si ya existe, actualizar la cantidad
    const existente = this.receta.find(r => r.insumo.id === insumo.id);
    if (existente) {
      existente.cantidad = this.cantidadInsumo;
      this.toastService.success(`Cantidad de "${insumo.descripcion}" actualizada`);
    } else {
      this.receta = [...this.receta, { insumo, cantidad: this.cantidadInsumo }];
    }

    // Limpiar selector
    this.insumoSeleccionadoId = null;
    this.cantidadInsumo = 1;
  }

  quitarInsumo(index: number): void {
    this.receta = this.receta.filter((_, i) => i !== index);
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const producto: Producto = this.myForm.value;

    if (this.editando && this.productoId) {
      this.productoService.actualizar(this.productoId, producto).subscribe({
        next: (p) => {
          this.guardarReceta(p.id!);
          this.toastService.success('Producto actualizado exitosamente');
        },
        error: (err) => {
          console.error('Error:', err);
          this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    } else {
      this.productoService.crear(producto).subscribe({
        next: (p) => {
          this.guardarReceta(p.id!);
          this.toastService.success('Producto creado exitosamente');
        },
        error: (err) => {
          console.error('Error:', err);
          this.toastService.error('Error al crear: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    }
  }

  /**
   * Guarda la receta del producto:
   * 1. Elimina todas las líneas existentes en BD
   * 2. Crea cada línea de la receta actual
   */
  private guardarReceta(productoId: number): void {
    this.guardandoReceta = true;

    this.detalleProductoService.eliminarPorProducto(productoId).subscribe({
      next: () => {
        if (this.receta.length === 0) {
          this.guardandoReceta = false;
          this.finalizarGuardado();
          return;
        }

        const creaciones = this.receta.map(linea =>
          this.detalleProductoService.crear({
            producto: { id: productoId },
            insumo:   { id: linea.insumo.id! },
            cantidad: linea.cantidad,
          })
        );

        forkJoin(creaciones).subscribe({
          next: () => {
            this.guardandoReceta = false;
            this.finalizarGuardado();
          },
          error: (err) => {
            this.guardandoReceta = false;
            console.error('Error al guardar receta:', err);
            this.toastService.error('Producto guardado pero hubo un error al guardar la receta');
            this.finalizarGuardado();
          },
        });
      },
      error: (err) => {
        this.guardandoReceta = false;
        console.error('Error al limpiar receta:', err);
        this.toastService.error('Producto guardado pero hubo un error al actualizar la receta');
        this.finalizarGuardado();
      },
    });
  }

  private finalizarGuardado(): void {
    this.resetForm();
    this.listarComponent?.cargarProductos();
  }

  resetForm(): void {
    this.editando = false;
    this.productoId = undefined;
    this.imagenPreview = null;
    this.receta = [];
    this.insumoSeleccionadoId = null;
    this.cantidadInsumo = 1;
    this.myForm.reset({ activo: true });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }

  getFieldError(field: string): string | null {
    if (!this.myForm.controls[field]) return null;
    const errors = this.myForm.controls[field].errors || {};
    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required':  return 'Este campo es requerido';
        case 'minlength': return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
        case 'min':       return `El valor mínimo es ${errors['min'].min}`;
      }
    }
    return null;
  }
}
