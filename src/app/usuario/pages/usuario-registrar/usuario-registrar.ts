import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Formutils } from '../../../utils/form-utils';
import { Usuario } from '../../interfaces/usuario.interface';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../../auth/services/auth.service';
import { DepartamentoService } from '../../../departamento/services/departamento.service';
import { MunicipioService } from '../../../municipio/service/municipio.service';
import { Departamento } from '../../../departamento/interfaces/departamento.interface';
import { Municipio } from '../../../municipio/interfaces/municipio.interface';
import { ListarPage } from '../usuario-listar/usuario-listar';

// Roles del POS — sincronizados con el enum Rol.java del backend
// Cada rol solo puede crear usuarios con roles de menor jerarquía
const ROLES_POR_ROL: Record<string, string[]> = {
  ROOT:          ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO', 'DOMICILIARIO'],
  PROPIETARIO:   ['ADMINISTRADOR', 'CAJERO', 'MESERO', 'DOMICILIARIO'],
  ADMINISTRADOR: ['CAJERO', 'MESERO', 'DOMICILIARIO'],
};

@Component({
  selector: 'app-registrar-page',
  imports: [ReactiveFormsModule, CommonModule, ListarPage],
  templateUrl: './usuario-registrar.html',
})
export class RegistrarPage implements OnInit {

  private readonly fb                 = inject(FormBuilder);
  private readonly usuarioService     = inject(UsuarioService);
  private readonly authService        = inject(AuthService);
  private readonly departamentoSvc    = inject(DepartamentoService);
  private readonly municipioSvc       = inject(MunicipioService);

  formUtils = Formutils;

  @ViewChild(ListarPage) listarComp?: ListarPage;

  rolesDisponibles: string[]  = [];
  departamentos: Departamento[] = [];
  municipios: Municipio[]       = [];
  municipiosFiltrados: Municipio[] = [];
  deptoSeleccionado: Departamento | null = null;

  myform = this.fb.group({
    nombre:   ['', Validators.required],
    apellido: ['', Validators.required],
    cedula:   ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rol:      ['', Validators.required],
    activo:   [true],
    departamentoId: [''],
    municipioId:    [''],
  });

  ngOnInit(): void {
    const rol = this.authService.getUserRole() ?? '';
    this.rolesDisponibles = ROLES_POR_ROL[rol] ?? [];
    this.cargarDepartamentos();
  }

  cargarDepartamentos(): void {
    this.departamentoSvc.obtenerTodos().subscribe({
      next: (data) => { this.departamentos = data; },
      error: (e)   => console.error('Error cargando departamentos:', e),
    });
    this.municipioSvc.obtenerTodos().subscribe({
      next: (data) => { this.municipios = data; },
      error: (e)   => console.error('Error cargando municipios:', e),
    });
  }

  onDepartamentoChange(): void {
    const id = this.myform.get('departamentoId')?.value;
    this.myform.patchValue({ municipioId: '' });
    this.deptoSeleccionado = this.departamentos.find(d => d.id === id) ?? null;
    this.municipiosFiltrados = id
      ? this.municipios.filter(m => m.departamento?.id === id)
      : [];
  }

  onSave(): void {
    if (this.myform.invalid) { this.myform.markAllAsTouched(); return; }

    const v = this.myform.getRawValue();
    const nuevoUsuario: Usuario = {
      nombre:   v.nombre   ?? '',
      apellido: v.apellido ?? '',
      cedula:   v.cedula   ?? '',
      email:    v.email    ?? '',
      password: v.password ?? '',
      rol:      v.rol      ?? '',
      activo:   v.activo   ?? true,
      ...(v.departamentoId ? { departamento: { id: v.departamentoId } } : {}),
      ...(v.municipioId    ? { municipio:    { id: v.municipioId    } } : {}),
    };

    this.usuarioService.crearUsuario(nuevoUsuario).subscribe({
      next: () => {
        alert('Usuario creado exitosamente');
        this.myform.reset({ activo: true });
        this.listarComp?.listarAction();
      },
      error: (err) => {
        alert('Error: ' + (err.error?.error ?? 'Error desconocido'));
      },
    });
  }
}
