import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
export class ImpuestoRegistrarPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly impuestoService = inject(ImpuestoService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  @ViewChild(ImpuestoListarPageComponent) listarComponent?: ImpuestoListarPageComponent;

  public editando: boolean = false;
  private impuestoId?: number;

  // Porcentajes comunes en Colombia: IVA 19%, IVA 5%, INC 8%
  public porcentajesComunes = [5, 8, 19];

  public myForm: FormGroup = this.fb.group({
    descripcion:         ['', [Validators.required, Validators.minLength(3)]],
    porcentajeImpuesto:  [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    estado:              ['ACTIVO', [Validators.required]],
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.editando = true;
        this.impuestoId = +id;
        this.impuestoService.obtenerPorId(this.impuestoId).subscribe({
          next: (imp) => this.myForm.patchValue(imp),
          error: (err) => console.error('Error al cargar impuesto:', err),
        });
      }
    });
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
          this.resetForm();
          this.listarComponent?.cargarImpuestos();
        },
        error: (err) => {
          console.error('Error:', err);
          this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    } else {
      this.impuestoService.crear(impuesto).subscribe({
        next: () => {
          this.toastService.success('Impuesto creado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarImpuestos();
        },
        error: (err) => {
          console.error('Error:', err);
          this.toastService.error('Error al crear: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    }
  }

  resetForm(): void {
    this.editando = false;
    this.impuestoId = undefined;
    this.myForm.reset({ estado: 'ACTIVO' });
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
