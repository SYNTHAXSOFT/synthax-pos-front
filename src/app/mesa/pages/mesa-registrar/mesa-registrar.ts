import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MesaService } from '../../services/mesa.service';
import { Mesa } from '../../interfaces/mesa.interface';
import { MesaListarPageComponent } from '../mesa-listar/mesa-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-mesa-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MesaListarPageComponent],
  templateUrl: './mesa-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class MesaRegistrarPageComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly mesaService = inject(MesaService);
  private readonly toastService = inject(ToastService);

  @ViewChild(MesaListarPageComponent) listarComponent?: MesaListarPageComponent;

  public editando: boolean = false;
  private mesaId?: number;
  public modalAbierto: boolean = false;

  public myForm: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.minLength(2)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    activo: [true],
  });

  ngOnInit(): void {}

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  abrirModal(): void {
    this.editando = false;
    this.mesaId = undefined;
    this.myForm.reset({ activo: true });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(id: number): void {
    this.mesaService.obtenerPorId(id).subscribe({
      next: (m) => {
        this.editando = true;
        this.mesaId = id;
        this.myForm.patchValue(m);
        this.modalAbierto = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => this.toastService.error('Error al cargar la mesa'),
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.editando = false;
    this.mesaId = undefined;
    this.myForm.reset({ activo: true });
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const mesa: Mesa = this.myForm.value;

    if (this.editando && this.mesaId) {
      this.mesaService.actualizar(this.mesaId, mesa).subscribe({
        next: () => {
          this.toastService.success('Mesa actualizada exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarMesas();
        },
        error: (err) => this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.mesaService.crear(mesa).subscribe({
        next: () => {
          this.toastService.success('Mesa creada exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarMesas();
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
