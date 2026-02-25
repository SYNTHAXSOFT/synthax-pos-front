import { Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartamentoService } from '../../services/departamento.service';
import { Departamento } from '../../interfaces/departamento.interface';
import { CommonModule } from '@angular/common';
import { ListarPageComponent } from '../listar-page/listar-page';

@Component({
  selector: 'app-registrar-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ListarPageComponent],
  templateUrl: './registrar-page.html'
})
export class RegistrarPageComponent {
  
  private fb = inject(FormBuilder);
  private departamentoService = inject(DepartamentoService);

  // 👇 referencia al componente hijo para refrescar la tabla
  @ViewChild(ListarPageComponent) listarComponent?: ListarPageComponent;

  public myForm: FormGroup = this.fb.group({
    id: [null, [Validators.required]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    activo: [true]
  });

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const departamento: Departamento = this.myForm.value;

    this.departamentoService.crearDepartamento(departamento).subscribe({
      next: () => {
        alert('Departamento creado exitosamente');
        this.myForm.reset({ activo: true });
        // 👇 refresca la tabla automáticamente
        this.listarComponent?.cargarDepartamentos();
      },
      error: (error) => {
        console.error('Error:', error);
        alert('Error al crear departamento: ' + (error.error?.error || 'Error desconocido'));
      }
    });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors 
      && this.myForm.controls[field].touched;
  }

  getFieldError(field: string): string | null {
    if (!this.myForm.controls[field]) return null;

    const errors = this.myForm.controls[field].errors || {};
    for (const key of Object.keys(errors)) {
      switch(key) {
        case 'required': return 'Este campo es requerido';
        case 'minlength': return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
      }
    }
    return null;
  }
}
