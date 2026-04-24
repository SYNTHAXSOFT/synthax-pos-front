import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MunicipioService } from '../../service/municipio.service';
import { DepartamentoService } from '../../../departamento/services/departamento.service';
import { Municipio } from '../../interfaces/municipio.interface';
import { Departamento } from '../../../departamento/interfaces/departamento.interface';
import { ListarMunicipioPageComponent } from '../municipio-listar/municipio-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-registrar-municipio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ListarMunicipioPageComponent],
  templateUrl: './municipio-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class RegistrarMunicipioPageComponent implements OnInit, OnDestroy {

  @ViewChild(ListarMunicipioPageComponent) listarComponent!: ListarMunicipioPageComponent;

  private fb                      = inject(FormBuilder);
  private municipioService        = inject(MunicipioService);
  private departamentoService     = inject(DepartamentoService);
  private readonly toastService   = inject(ToastService);

  public departamentos: Departamento[] = [];
  public editando:     boolean = false;
  public modalAbierto: boolean = false;
  private municipioId?: number;

  public myForm: FormGroup = this.fb.group({
    id:             [null, [Validators.required]],
    nombre:         ['',   [Validators.required, Validators.minLength(3)]],
    departamentoId: [null, [Validators.required]],
    activo:         [true],
  });

  ngOnInit(): void {
    this.cargarDepartamentos();
  }

  ngOnDestroy(): void { document.body.style.overflow = ''; }

  cargarDepartamentos(): void {
    this.departamentoService.obtenerTodos().subscribe({
      next: (data) => this.departamentos = data,
    });
  }

  abrirModal(): void {
    this.editando = false;
    this.municipioId = undefined;
    this.myForm.reset({ activo: true });
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(id: number): void {
    this.municipioService.obtenerPorId(id.toString()).subscribe({
      next: (m) => {
        this.editando = true;
        this.municipioId = id;
        this.myForm.patchValue({
          id:             m.id,
          nombre:         m.nombre,
          departamentoId: m.departamento?.id,
          activo:         m.activo,
        });
        this.modalAbierto = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => this.toastService.error('Error al cargar el municipio'),
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    this.editando = false;
    this.municipioId = undefined;
    this.myForm.reset({ activo: true });
  }

  onSave(): void {
    if (this.myForm.invalid) { this.myForm.markAllAsTouched(); return; }

    const municipio: Municipio = {
      id:          this.myForm.value.id,
      nombre:      this.myForm.value.nombre,
      activo:      this.myForm.value.activo,
      departamento:{ id: this.myForm.value.departamentoId },
    };

    if (this.editando && this.municipioId) {
      this.municipioService.actualizar(this.municipioId.toString(), municipio).subscribe({
        next: () => {
          this.toastService.success('Municipio actualizado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarMunicipios();
        },
        error: (err) => this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.municipioService.crearMunicipio(municipio).subscribe({
        next: () => {
          this.toastService.success('Municipio creado exitosamente');
          this.cerrarModal();
          this.listarComponent?.cargarMunicipios();
        },
        error: (err) => this.toastService.error('Error al crear: ' + (err.error?.error || 'Error desconocido')),
      });
    }
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }

  getFieldError(field: string): string | null {
    const errors = this.myForm.get(field)?.errors;
    if (!errors) return null;
    if (errors['required'])  return 'Este campo es requerido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    return null;
  }
}