import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImpuestoService } from '../../services/impuesto.service';
import { Impuesto } from '../../interfaces/impuesto.interface';
import { ImpuestoListarPageComponent } from '../impuesto-listar/impuesto-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-impuesto-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImpuestoListarPageComponent],
  templateUrl: './impuesto-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class ImpuestoRegistrarPageComponent implements OnInit, OnDestroy {
  private readonly fb             = inject(FormBuilder);
  private readonly impuestoService = inject(ImpuestoService);
  private readonly toastService   = inject(ToastService);

  @ViewChild(ImpuestoListarPageComponent) listarComponent?: ImpuestoListarPageComponent;

  public editando: boolean = false;
  private impuestoId?: number;
  public modalAbierto: boolean = false;

  public porcentajesComunes = [5, 8, 19];

  public myForm: FormGroup = this.fb.group({
    descripcion:        ['', [Validators.required, Validators.minLength(3)]],
    porcentajeImpuesto: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    estado:             ['ACTIVO', [Validators.required]],
  });

  ngOnInit(): void {}

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  abrirModal(): void {
    this.editando = false;
    this.impuestoId = undefined;
    this.myForm.reset({ estado: 'ACTIVO' });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(id: number): void {
    this.impuestoService.obtenerPorId(id).subscribe({
      next: (imp) => {
        this.editando = true;
        this.impuestoId = id;
        this.myForm.patchValue(imp);
        this.modalAbierto = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => this.toastService.error('Error al cargar el impuesto'),
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.editando = false;
    this.impuestoId = undefined;
    this.myForm.reset({ estado: 'ACTIVO' });
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const impuesto: Impuesto = this.myForm.value;

    if (this.editando && this.impuestoId) {
      this.impuestoService.actualizar(this.impuestoId, impuesto).subscribe({
        next: () => {
          this.toastService.success('Impuesto actualizado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarImpuestos();
        },
        error: (err) => this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.impuestoService.crear(impuesto).subscribe({
        next: () => {
          this.toastService.success('Impuesto creado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarImpuestos();
        },
        error: (err) => this.toastService.error('Error al crear: ' + (err.error?.error || 'Error desconocido')),
      });
    }
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
        case 'max':       return `El valor máximo es ${errors['max'].max}`;
      }
    }
    return null;
  }
}
