import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
export class ProductoRegistrarPageComponent implements OnInit, OnDestroy {
  private readonly fb                     = inject(FormBuilder);
  private readonly productoService        = inject(ProductoService);
  private readonly detalleProductoService = inject(DetalleProductoService);
  private readonly insumoService          = inject(InsumoService);
  private readonly toastService           = inject(ToastService);

  @ViewChild(ProductoListarPageComponent) listarComponent?: ProductoListarPageComponent;

  public editando: boolean = false;
  private productoId?: number;
  public modalAbierto: boolean = false;

  public imagenPreview: string | null = null;

  public insumos: Insumo[] = [];
  public receta: LineaReceta[] = [];
  public insumoSeleccionadoId: number | null = null;
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
    this.insumoService.obtenerActivos().subscribe({
      next: (data) => (this.insumos = data),
      error: (err) => console.error('Error al cargar insumos:', err),
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  abrirModal(): void {
    this.editando = false;
    this.productoId = undefined;
    this.imagenPreview = null;
    this.receta = [];
    this.insumoSeleccionadoId = null;
    this.cantidadInsumo = 1;
    this.myForm.reset({ activo: true });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(id: number): void {
    this.productoService.obtenerPorId(id).subscribe({
      next: (p) => {
        this.editando = true;
        this.productoId = id;
        this.imagenPreview = p.imagen ?? null;
        this.receta = [];
        this.insumoSeleccionadoId = null;
        this.cantidadInsumo = 1;
        this.myForm.patchValue(p);

        this.detalleProductoService.obtenerPorProducto(id).subscribe({
          next: (detalles) => {
            this.receta = detalles
              .filter(d => d.insumo)
              .map(d => ({ insumo: d.insumo!, cantidad: d.cantidad, detalleId: d.id }));
          },
          error: (err) => console.error('Error al cargar receta:', err),
        });

        this.modalAbierto = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => this.toastService.error('Error al cargar el producto'),
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.editando = false;
    this.productoId = undefined;
    this.imagenPreview = null;
    this.receta = [];
    this.insumoSeleccionadoId = null;
    this.cantidadInsumo = 1;
    this.myForm.reset({ activo: true });
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
    if (file.size > 2 * 1024 * 1024) {
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
    if (!this.insumoSeleccionadoId) { this.toastService.error('Selecciona un insumo'); return; }
    if (!this.cantidadInsumo || this.cantidadInsumo <= 0) { this.toastService.error('La cantidad debe ser mayor a 0'); return; }

    const insumo = this.insumos.find(i => i.id === +this.insumoSeleccionadoId!);
    if (!insumo) return;

    const existente = this.receta.find(r => r.insumo.id === insumo.id);
    if (existente) {
      existente.cantidad = this.cantidadInsumo;
      this.toastService.success(`Cantidad de "${insumo.descripcion}" actualizada`);
    } else {
      this.receta = [...this.receta, { insumo, cantidad: this.cantidadInsumo }];
    }
    this.insumoSeleccionadoId = null;
    this.cantidadInsumo = 1;
  }

  quitarInsumo(index: number): void {
    this.receta = this.receta.filter((_, i) => i !== index);
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  onSave(): void {
    if (this.myForm.invalid) { this.myForm.markAllAsTouched(); return; }

    const producto: Producto = this.myForm.value;

    if (this.editando && this.productoId) {
      this.productoService.actualizar(this.productoId, producto).subscribe({
        next: (p) => {
          this.toastService.success('Producto actualizado exitosamente');
          this.guardarReceta(p.id!);
        },
        error: (err) => this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.productoService.crear(producto).subscribe({
        next: (p) => {
          this.toastService.success('Producto creado exitosamente');
          this.guardarReceta(p.id!);
        },
        error: (err) => this.toastService.error('Error al crear: ' + (err.error?.error || 'Error desconocido')),
      });
    }
  }

  private guardarReceta(productoId: number): void {
    this.guardandoReceta = true;

    this.detalleProductoService.eliminarPorProducto(productoId).subscribe({
      next: () => {
        if (this.receta.length === 0) {
          this.guardandoReceta = false;
          this.cerrarModal();
          this.listarComponent?.cargarProductos();
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
            this.cerrarModal();
            this.listarComponent?.cargarProductos();
          },
          error: (err) => {
            this.guardandoReceta = false;
            console.error('Error al guardar receta:', err);
            this.toastService.error('Producto guardado pero hubo un error al guardar la receta');
            this.cerrarModal();
            this.listarComponent?.cargarProductos();
          },
        });
      },
      error: (err) => {
        this.guardandoReceta = false;
        console.error('Error al limpiar receta:', err);
        this.toastService.error('Producto guardado pero hubo un error al actualizar la receta');
        this.cerrarModal();
        this.listarComponent?.cargarProductos();
      },
    });
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
