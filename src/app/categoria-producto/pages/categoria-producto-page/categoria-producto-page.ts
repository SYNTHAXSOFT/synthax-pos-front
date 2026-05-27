import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoriaProductoService } from '../../services/categoria-producto.service';
import { CategoriaProducto } from '../../interfaces/categoria-producto.interface';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-categoria-producto-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categoria-producto-page.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class CategoriaProductoPageComponent implements OnInit, OnDestroy {
  private readonly fb      = inject(FormBuilder);
  private readonly service = inject(CategoriaProductoService);
  private readonly toast   = inject(ToastService);

  public categorias: CategoriaProducto[] = [];
  public cargando   = false;
  public guardando  = false;
  public modalAbierto = false;
  public editando   = false;
  private editandoId?: number;

  public form: FormGroup = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    orden:       [0, [Validators.required, Validators.min(0)]],
    activo:      [true],
  });

  ngOnInit(): void {
    this.cargarCategorias();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  cargarCategorias(): void {
    this.cargando = true;
    this.service.listar().subscribe({
      next: (data) => { this.categorias = data; this.cargando = false; },
      error: () => { this.toast.error('Error al cargar categorías'); this.cargando = false; },
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  abrirModalNueva(): void {
    this.editando   = false;
    this.editandoId = undefined;
    this.form.reset({ activo: true, orden: 0 });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(cat: CategoriaProducto): void {
    this.editando   = true;
    this.editandoId = cat.id;
    this.form.patchValue({
      nombre:      cat.nombre,
      descripcion: cat.descripcion ?? '',
      orden:       cat.orden ?? 0,
      activo:      cat.activo ?? true,
    });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.editando   = false;
    this.editandoId = undefined;
    this.form.reset({ activo: true, orden: 0 });
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;

    const payload: CategoriaProducto = this.form.value;

    const op$ = this.editando && this.editandoId
      ? this.service.actualizar(this.editandoId, payload)
      : this.service.crear(payload);

    op$.subscribe({
      next: () => {
        this.toast.success(this.editando ? 'Categoría actualizada' : 'Categoría creada');
        this.guardando = false;
        this.cerrarModal();
        this.cargarCategorias();
      },
      error: (err) => {
        this.toast.error(err.error?.error ?? 'Error al guardar');
        this.guardando = false;
      },
    });
  }

  // ── Desactivar / Eliminar ─────────────────────────────────────────────────

  desactivar(cat: CategoriaProducto): void {
    if (!confirm(`¿Desactivar la categoría "${cat.nombre}"?`)) return;
    this.service.desactivar(cat.id!).subscribe({
      next: () => { this.toast.success('Categoría desactivada'); this.cargarCategorias(); },
      error: () => this.toast.error('Error al desactivar'),
    });
  }

  activar(cat: CategoriaProducto): void {
    const payload: CategoriaProducto = { ...cat, activo: true };
    this.service.actualizar(cat.id!, payload).subscribe({
      next: () => { this.toast.success('Categoría activada'); this.cargarCategorias(); },
      error: () => this.toast.error('Error al activar'),
    });
  }

  eliminar(cat: CategoriaProducto): void {
    if (!confirm(`¿Eliminar definitivamente la categoría "${cat.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.service.eliminar(cat.id!).subscribe({
      next: () => { this.toast.success('Categoría eliminada'); this.cargarCategorias(); },
      error: (err) => this.toast.error(err.error?.error ?? 'Error al eliminar'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isValidField(field: string): boolean | null {
    return this.form.controls[field].errors && this.form.controls[field].touched;
  }

  getFieldError(field: string): string | null {
    const errors = this.form.controls[field]?.errors ?? {};
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
