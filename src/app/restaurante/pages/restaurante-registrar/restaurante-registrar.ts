import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { RestauranteRequest } from '../../interfaces/restaurante.interface';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { Usuario } from '../../../usuario/interfaces/usuario.interface';
import { RestauranteListarPageComponent } from '../restaurante-listar/restaurante-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-restaurante-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RestauranteListarPageComponent],
  templateUrl: './restaurante-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class RestauranteRegistrarPageComponent implements OnInit {
  private readonly fb                 = inject(FormBuilder);
  private readonly restauranteService = inject(RestauranteService);
  private readonly usuarioService     = inject(UsuarioService);
  private readonly route              = inject(ActivatedRoute);
  private readonly toastService       = inject(ToastService);

  @ViewChild(RestauranteListarPageComponent) listarComponent?: RestauranteListarPageComponent;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  public editando: boolean = false;
  private restauranteId?: number;

  /** Todos los usuarios con rol PROPIETARIO disponibles. */
  public propietarios: Usuario[] = [];

  /** Propietarios actualmente asignados al restaurante. */
  public propietariosAsignados: Usuario[] = [];

  /** Texto del buscador de propietarios. */
  public busquedaPropietario: string = '';

  /** Propietarios disponibles (no asignados) filtrados por búsqueda. */
  get propietariosFiltrados(): Usuario[] {
    const q = this.busquedaPropietario.toLowerCase().trim();
    const asignadosIds = new Set(this.propietariosAsignados.map(p => p.id));
    return this.propietarios.filter(u =>
      !asignadosIds.has(u.id) &&
      (!q || `${u.nombre} ${u.apellido} ${u.cedula}`.toLowerCase().includes(q))
    );
  }

  /** Vista previa del logo (Base64 o URL existente) */
  public logoPreview: string = '';
  public logoNombre:  string = '';

  public myForm: FormGroup = this.fb.group({
    codigo:      ['', [Validators.required, Validators.minLength(2)]],
    nombre:      ['', [Validators.required, Validators.minLength(3)]],
    logo:        [''],
    telefono:    [''],
    correo:      ['', [Validators.email]],
    descripcion: [''],
    activo:      [true],
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.editando = true;
        this.restauranteId = +id;
        // Cargar propietarios primero, luego el restaurante para poder cruzar datos
        this.usuarioService.listarPorRolActivos('PROPIETARIO').subscribe({
          next: (lista) => {
            this.propietarios = lista;
            this.restauranteService.obtenerPorId(this.restauranteId!).subscribe({
              next: (r) => {
                this.myForm.patchValue({
                  codigo:      r.codigo,
                  nombre:      r.nombre,
                  logo:        r.logo,
                  telefono:    r.telefono,
                  correo:      r.correo,
                  descripcion: r.descripcion,
                  activo:      r.activo,
                });
                // Cruzar IDs asignados con la lista completa para tener objetos completos
                const asignadosIds = new Set((r.propietarios ?? []).map(p => p.id));
                this.propietariosAsignados = this.propietarios.filter(u => asignadosIds.has(u.id));
                if (r.logo) {
                  this.logoPreview = r.logo;
                  this.logoNombre  = 'Logo actual';
                }
              },
              error: (err) => console.error('Error al cargar restaurante:', err),
            });
          },
        });
      } else {
        this.cargarPropietarios();
      }
    });
  }

  cargarPropietarios(): void {
    this.usuarioService.listarPorRolActivos('PROPIETARIO').subscribe({ next: (d) => this.propietarios = d });
  }

  /** Abre el selector de archivo del dispositivo */
  abrirSelectorArchivo(): void {
    this.fileInput.nativeElement.click();
  }

  /** Lee la imagen seleccionada y la convierte a Base64 */
  onLogoSeleccionado(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;

    // Validar tipo
    if (!archivo.type.startsWith('image/')) {
      this.toastService.error('Solo se permiten archivos de imagen (JPG, PNG, WEBP, SVG...)');
      return;
    }
    // Validar tamaño (máx. 2 MB)
    if (archivo.size > 2 * 1024 * 1024) {
      this.toastService.error('La imagen no debe superar los 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.myForm.patchValue({ logo: base64 });
      this.logoPreview = base64;
      this.logoNombre  = archivo.name;
    };
    reader.readAsDataURL(archivo);
  }

  /** Elimina el logo seleccionado */
  quitarLogo(): void {
    this.logoPreview = '';
    this.logoNombre  = '';
    this.myForm.patchValue({ logo: '' });
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  agregarPropietario(usuario: Usuario): void {
    if (!this.propietariosAsignados.find(p => p.id === usuario.id)) {
      this.propietariosAsignados = [...this.propietariosAsignados, usuario];
    }
    this.busquedaPropietario = '';
  }

  quitarPropietario(id: number): void {
    this.propietariosAsignados = this.propietariosAsignados.filter(p => p.id !== id);
  }

  buildPayload(): RestauranteRequest {
    const v = this.myForm.value;
    return {
      codigo:       v.codigo,
      nombre:       v.nombre,
      logo:         v.logo || undefined,
      telefono:     v.telefono || undefined,
      correo:       v.correo || undefined,
      descripcion:  v.descripcion || undefined,
      activo:       v.activo,
      propietarios: this.propietariosAsignados.map(p => ({ id: p.id! })),
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
          this.toastService.success('Restaurante actualizado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarRestaurantes();
        },
        error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido')),
      });
    } else {
      this.restauranteService.crear(payload).subscribe({
        next: () => {
          this.toastService.success('Restaurante creado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarRestaurantes();
        },
        error: (err) => this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido')),
      });
    }
  }

  resetForm(): void {
    this.editando                  = false;
    this.restauranteId             = undefined;
    this.logoPreview               = '';
    this.logoNombre                = '';
    this.propietariosAsignados  = [];
    this.busquedaPropietario    = '';
    this.myForm.reset({ activo: true });
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
