import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MunicipioService } from '../../service/municipio.service';
import { DepartamentoService } from '../../../departamento/services/departamento.service';
import { Municipio } from '../../interfaces/municipio.interface';
import { Departamento } from '../../../departamento/interfaces/departamento.interface';
import { ListarMunicipioPageComponent } from '../listar-page/listar-page';


@Component({
  selector: 'app-registrar-municipio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ListarMunicipioPageComponent],
  templateUrl: './registrar-page.html'
})
export class RegistrarMunicipioPageComponent implements OnInit {

  @ViewChild(ListarMunicipioPageComponent) listarComponent!: ListarMunicipioPageComponent;

  private fb = inject(FormBuilder);
  private municipioService = inject(MunicipioService);
  private departamentoService = inject(DepartamentoService);

  public departamentos: Departamento[] = [];
  public myForm: FormGroup = this.fb.group({
    id: [null, [Validators.required]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    departamentoId: [null, [Validators.required]],
    activo: [true]
  });

  ngOnInit(): void {
    this.cargarDepartamentos();
  }

  cargarDepartamentos(): void {
    this.departamentoService.obtenerTodos().subscribe({
      next: (data) => this.departamentos = data,
      error: (error) => console.error('Error al cargar departamentos:', error)
    });
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const municipio: Municipio = {
      id: this.myForm.value.id,
      nombre: this.myForm.value.nombre,
      activo: this.myForm.value.activo,
      departamento: {
        id: this.myForm.value.departamentoId
      }
    };

    this.municipioService.crearMunicipio(municipio).subscribe({
      next: (response) => {
        alert('Municipio creado exitosamente');
        this.myForm.reset({ activo: true });
        
        if (this.listarComponent) {
          this.listarComponent.cargarMunicipios();
        }
      },
      error: (error) => {
        console.error('Error:', error);
        alert('Error al crear municipio: ' + (error.error?.error || 'Error desconocido'));
      }
    });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }

  getFieldError(field: string): string | null {
    const control = this.myForm.get(field);
    if (!control || !control.errors) return null;
    const errors = control.errors;
    if (errors['required']) return 'Este campo es requerido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    return null;
  }
}