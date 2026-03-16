import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { RestauranteRequest } from '../../interfaces/restaurante.interface';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { Usuario } from '../../../usuario/interfaces/usuario.interface';
import { RestauranteListarPageComponent } from '../restaurante-listar/restaurante-listar';

@Component({
  selector: 'app-restaurante-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RestauranteListarPageComponent],
  templateUrl: './restaurante-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class RestauranteRegistrarPageComponent implements OnInit {
  private readonly fb                 = inject(FormBuilder);
  private readonly restauranteService = inject(RestauranteService);
  private readonly usuarioService     = inject(UsuarioService);
  private readonly route              = inject(ActivatedRoute);

  @ViewChild(RestauranteListarPageComponent) listarComponent?: RestauranteListarPageComponent;

  public editando: boolean = false;
  private restauranteId?: number;
  public propietarios: Usuario[] = [];

  public myForm: FormGroup = this.fb.group({
    codigo:      ['', [Validators.required, Validators.minLength(2)]],
    nombre:      ['', [Validators.required, Validators.minLength(3)]],
    logo:        [''],
    telefono:    [''],
    correo:      ['', [Validators.email]],
    descripcion: [''],
    propietarioId: [null],
    activo:      [true],
  });

  ngOnInit(): void {
    this.cargarPropietarios();
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.editando = true;
        this.restauranteId = +id;
        this.restauranteService.obtenerPorId(this.restauranteId).subscribe({
          next: (r) => {
            this.myForm.patchValue({
              codigo:      r.codigo,
              nombre:      r.nombre,
              logo:        r.logo,
              telefono:    r.telefono,
              correo:      r.correo,
              descripcion: r.descripcion,
              propietarioId: r.propietario?.id ?? null,
              activo:      r.activo,
            });
          },
          error: (err) => console.error('Error al cargar restaurante:', err),
        });
      }
    });
  }

  cargarPropietarios(): void {
    this.usuarioService.listarPorRolActivos('PROPIETARIO').subscribe({ next: (d) => this.propietarios = d });
  }

  buildPayload(): RestauranteRequest {
    const v = this.myForm.value;
    return {
      codigo:      v.codigo,
      nombre:      v.nombre,
      logo:        v.logo || undefined,
      telefono:    v.telefono || undefined,
      correo:      v.correo || undefined,
      descripcion: v.descripcion || undefined,
      activo:      v.activo,
      ...(v.propietarioId ? { propietario: { id: v.propietarioId } } : {}),
    };
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }
    const payload = this.buildPayload();

    if (this.editando && this.restauranteId) {
      this.restauranteService.actualizar(this.restauranteId, payload).subscribe({
        next: () => {
          alert('Restaurante actualizado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarRestaurantes();
        },
        error: (err) => alert('Error: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.restauranteService.crear(payload).subscribe({
        next: () => {
          alert('Restaurante creado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarRestaurantes();
        },
        error: (err) => alert('Error: ' + (err.error?.error || 'Error desconocido')),
      });
    }
  }

  resetForm(): void {
    this.editando = false;
    this.restauranteId = undefined;
    this.myForm.reset({ activo: true });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
