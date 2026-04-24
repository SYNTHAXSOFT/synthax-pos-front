import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { ToastService } from '../../../shared/services/toast.service';

const ROLES_POR_ROL: Record<string, string[]> = {
  ROOT:          ['ROOT', 'PROPIETARIO'],
  PROPIETARIO:   ['ADMINISTRADOR', 'CAJERO', 'MESERO', 'COCINERO', 'DOMICILIARIO'],
  ADMINISTRADOR: ['CAJERO', 'MESERO', 'COCINERO', 'DOMICILIARIO'],
};

@Component({
  selector: 'app-registrar-page',
  imports: [ReactiveFormsModule, CommonModule, ListarPage],
  templateUrl: './usuario-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class RegistrarPage implements OnInit, OnDestroy {

  private readonly fb              = inject(FormBuilder);
  private readonly usuarioService  = inject(UsuarioService);
  private readonly authService     = inject(AuthService);
  private readonly departamentoSvc = inject(DepartamentoService);
  private readonly municipioSvc    = inject(MunicipioService);
  private readonly toastService    = inject(ToastService);

  formUtils = Formutils;

  @ViewChild(ListarPage) listarComp?: ListarPage;
  @ViewChild('fotoInput') fotoInput!: ElementRef<HTMLInputElement>;

  public editando: boolean = false;
  private usuarioId?: number;
  public modalAbierto: boolean = false;

  rolesDisponibles: string[]       = [];
  departamentos: Departamento[]    = [];
  municipios: Municipio[]          = [];
  municipiosFiltrados: Municipio[] = [];
  deptoSeleccionado: Departamento | null = null;

  // ── Foto de perfil ────────────────────────────────────────────────────────
  // null  = no hay foto / sin cambio (al editar: conserva la existente)
  // ''    = quitar foto explícitamente (solo aplica al editar)
  // 'data:...' = imagen nueva en Base64
  fotoPerfilBase64: string | null = null;

  myform = this.fb.group({
    nombre:         ['', Validators.required],
    apellido:       ['', Validators.required],
    cedula:         ['', Validators.required],
    email:          ['', [Validators.required, Validators.email]],
    password:       ['', [Validators.required, Validators.minLength(6)]],
    rol:            ['', Validators.required],
    activo:         [true],
    departamentoId: [''],
    municipioId:    [''],
  });

  ngOnInit(): void {
    const rol = this.authService.getUserRole() ?? '';
    this.rolesDisponibles = ROLES_POR_ROL[rol] ?? [];
    this.departamentoSvc.obtenerTodos().subscribe({ next: (d) => this.departamentos = d });
    this.municipioSvc.obtenerTodos().subscribe({ next: (d) => this.municipios = d });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  // ── Foto helpers ──────────────────────────────────────────────────────────

  triggerFotoInput(): void {
    this.fotoInput?.nativeElement.click();
  }

  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.toastService.error('La imagen no debe superar 2 MB');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => { this.fotoPerfilBase64 = reader.result as string; };
    reader.readAsDataURL(file);
    input.value = ''; // reset para que pueda reseleccionarse el mismo archivo
  }

  quitarFoto(): void {
    this.fotoPerfilBase64 = '';  // cadena vacía = quitar foto al guardar
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  abrirModal(): void {
    this.editando    = false;
    this.usuarioId   = undefined;
    this.fotoPerfilBase64 = null;
    this.deptoSeleccionado = null;
    this.municipiosFiltrados = [];
    this.myform.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.myform.get('password')?.updateValueAndValidity();
    this.myform.reset({ activo: true });

    // ── Auto-rellenar departamento/municipio desde el restaurante activo ──
    // Prioridad: restaurante activo → usuario logueado
    const rest = this.authService.getCurrentRestaurante() as any;
    const user = this.authService.getCurrentUser();

    const deptId = rest?.departamento?.id ?? user?.departamento?.id ?? '';
    const munId  = rest?.municipio?.id    ?? user?.municipio?.id    ?? '';

    if (deptId) {
      this.deptoSeleccionado   = this.departamentos.find(d => d.id === deptId) ?? null;
      this.municipiosFiltrados = this.municipios.filter(m => m.departamento?.id === deptId);
      this.myform.patchValue({ departamentoId: deptId, municipioId: munId || '' });
    }

    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirModalEditar(id: number): void {
    this.usuarioService.obtenerPorId(id).subscribe({
      next: (u) => {
        this.editando    = true;
        this.usuarioId   = id;
        // Cargar foto existente (null si no tiene)
        this.fotoPerfilBase64 = u.fotoPerfil ?? null;

        this.myform.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.myform.get('password')?.updateValueAndValidity();

        this.myform.patchValue({
          nombre:         u.nombre,
          apellido:       u.apellido,
          cedula:         u.cedula,
          email:          u.email,
          password:       '',
          rol:            u.rol,
          activo:         u.activo,
          departamentoId: (u.departamento?.id as unknown as string) ?? '',
          municipioId:    (u.municipio?.id    as unknown as string) ?? '',
        });

        if (u.departamento?.id) {
          this.deptoSeleccionado   = this.departamentos.find(d => d.id === u.departamento?.id) ?? null;
          this.municipiosFiltrados = this.municipios.filter(m => m.departamento?.id === u.departamento?.id);
        }

        this.modalAbierto = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => this.toastService.error('Error al cargar el usuario'),
    });
  }

  cerrarModal(): void {
    this.modalAbierto     = false;
    this.fotoPerfilBase64 = null;
    document.body.style.overflow = '';
    this.editando  = false;
    this.usuarioId = undefined;
    this.deptoSeleccionado   = null;
    this.municipiosFiltrados = [];
    this.myform.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.myform.get('password')?.updateValueAndValidity();
    this.myform.reset({ activo: true });
  }

  onDepartamentoChange(): void {
    const id = this.myform.get('departamentoId')?.value;
    this.myform.patchValue({ municipioId: '' });
    this.deptoSeleccionado   = this.departamentos.find(d => d.id === id) ?? null;
    this.municipiosFiltrados = id
      ? this.municipios.filter(m => m.departamento?.id === id)
      : [];
  }

  onSave(): void {
    if (this.myform.invalid) { this.myform.markAllAsTouched(); return; }

    const v = this.myform.getRawValue();

    if (this.editando && this.usuarioId) {
      const usuarioActualizado = {
        nombre:   v.nombre   ?? '',
        apellido: v.apellido ?? '',
        cedula:   v.cedula   ?? '',
        email:    v.email    ?? '',
        rol:      v.rol      ?? '',
        activo:   v.activo   ?? true,
        ...(v.password       ? { password:    v.password } : {}),
        ...(v.departamentoId ? { departamento: { id: v.departamentoId } } : {}),
        ...(v.municipioId    ? { municipio:    { id: v.municipioId    } } : {}),
        // null = sin cambio; '' = quitar foto; 'data:...' = nueva foto
        ...(this.fotoPerfilBase64 !== null ? { fotoPerfil: this.fotoPerfilBase64 } : {}),
      } as Usuario;
      this.usuarioService.actualizar(this.usuarioId, usuarioActualizado).subscribe({
        next: (usuarioActual) => {
          // Si el usuario editado es el que está logueado, actualizar la sesión
          // para que la foto del sidebar se refresque sin necesidad de re-login.
          if (this.usuarioId === this.authService.getUserId()) {
            this.authService.actualizarUsuarioEnSesion({
              fotoPerfil: (usuarioActualizado as any).fotoPerfil ?? undefined,
              nombre:     usuarioActualizado.nombre,
              apellido:   usuarioActualizado.apellido,
            });
          }
          this.toastService.success('Usuario actualizado exitosamente');
          this.cerrarModal();
          this.listarComp?.listarAction();
        },
        error: (err) => this.toastService.error('Error: ' + (err.error?.error ?? 'Error desconocido')),
      });
    } else {
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
        // Solo incluir si hay foto seleccionada (cadena vacía no aplica en creación)
        ...(this.fotoPerfilBase64 ? { fotoPerfil: this.fotoPerfilBase64 } : {}),
      };
      this.usuarioService.crearUsuario(nuevoUsuario).subscribe({
        next: () => {
          this.toastService.success('Usuario creado exitosamente');
          this.cerrarModal();
          this.listarComp?.listarAction();
        },
        error: (err) => this.toastService.error('Error: ' + (err.error?.error ?? 'Error desconocido')),
      });
    }
  }
}
