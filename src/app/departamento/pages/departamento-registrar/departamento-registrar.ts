import { Component, inject, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartamentoService } from '../../services/departamento.service';
import { Departamento } from '../../interfaces/departamento.interface';
import { CommonModule } from '@angular/common';
import { ListarPageComponent } from '../departamento-listar/departamento-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-registrar-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ListarPageComponent],
  templateUrl: './departamento-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class RegistrarPageComponent implements OnDestroy {

  private fb                      = inject(FormBuilder);
  private departamentoService     = inject(DepartamentoService);
  private readonly toastService   = inject(ToastService);

  @ViewChild(ListarPageComponent) listarComponent?: ListarPageComponent;

  public editando:      boolean = false;
  public modalAbierto:  boolean = false;
  private departamentoId?: string;

  public myForm: FormGroup = this.fb.group({
    id:     [null, [Validators.required]],
    nombre: ['',   [Validators.required, Validators.minLength(3)]],
    activo: [true],
  });

  ngOnDestroy(): void { document.body.style.overflow = ''; }

  abrirModal(): void {
    this.editando = false;
    this.departamentoId = undefined;
    this.myForm.reset({ activo: true });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(id: string): void {
    this.departamentoService.obtenerPorId(id).subscribe({
      next: (d) => {
        this.editando = true;
        this.departamentoId = id;
        this.myForm.patchValue(d);
        this.modalAbierto = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => this.toastService.error('Error al cargar el departamento'),
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.editando = false;
    this.departamentoId = undefined;
    this.myForm.reset({ activo: true });
  }

  onSave(): void {
    if (this.myForm.invalid) { this.myForm.markAllAsTouched(); return; }

    const departamento: Departamento = this.myForm.value;

    if (this.editando && this.departamentoId) {
      this.departamentoService.actualizar(this.departamentoId, departamento).subscribe({
        next: () => {
          this.toastService.success('Departamento actualizado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarDepartamentos();
        },
        error: (err) => this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.departamentoService.crearDepartamento(departamento).subscribe({
        next: () => {
          this.toastService.success('Departamento creado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarDepartamentos();
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
      }
    }
    return null;
  }
}
