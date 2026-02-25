import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Formutils } from '../../../utils/form-utils';
import { Usuario } from '../../interfaces/usuario.interface';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../../auth/services/auth.service'; 
import { ListarPage } from '../listar-page/listar-page';
import { CommonModule } from '@angular/common';
import { DepartamentoService } from '../../../departamento/services/departamento.service';
import { MunicipioService } from '../../../municipio/service/municipio.service';
import { Departamento } from '../../../departamento/interfaces/departamento.interface';
import { Municipio } from '../../../municipio/interfaces/municipio.interface';
import { ELECCION } from '../../../utils/constantes-utils';

@Component({
  selector: 'app-registrar-page',
  imports: [ReactiveFormsModule, ListarPage, CommonModule], 
  templateUrl: './registrar-page.html',
})
export class RegistrarPage implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);

  private readonly departamentoService = inject(DepartamentoService);
  private readonly municipioService = inject(MunicipioService);

  snCandidato = signal<boolean>(true);

  formUtils = Formutils;

  @ViewChild(ListarPage) listarUsuariosComponente?: ListarPage;

  rolesDisponibles: string[] = [];

  public departamentosList: Departamento[] = [];
  public municipiosList: Municipio[] = [];
  public municipiosListFiltrados: Municipio[] = [];
  public departamentoSeleccionado: Departamento | null = null;


  currentUserRole: string = '';

  //me valida si es root
  isRoot: boolean = false;

  myform = this.fb.group({
    nombre:         ['', [Validators.required]],
    apellido:       ['', [Validators.required]],
    cedula:         ['', [Validators.required]],
    email:          ['', [Validators.required, Validators.email]],
    password:       ['', [Validators.required, Validators.minLength(6)]],
    rol:            ['', Validators.required],
    activo:         [true],
    candidatoId:    [''],
    //
    departamentoId: [{value: '', disabled: true }, [Validators.required]],
    municipioId:    [{value: '', disabled: true }, [Validators.required]],
  });

  ngOnInit(): void {
  }

  precargarInformacionNoRoot(){
    let candidatoId: number | null = this.authService.getCandidatoId();
  
    if(candidatoId === null) {
      console.error('No se pudo obtener usuario en sesion');
      return;
    };

  }



  // 👇 AGREGAR ESTOS MÉTODOS AL FINAL

  cargarDepartamentos(): void {
    this.cargarMunicipios();
  }

  cargarMunicipios(): void {
    this.municipioService.obtenerTodos().subscribe({
      next: (data) => {
        this.municipiosList = data
        this.filtrarMunicipios();
      },
      error: (error) => console.error('Error al cargar municipios:', error)
    });
  }

  onDepartamentoChange(): void {
    const departamentoId = this.myform.get('departamentoId')?.value;
    
    // Limpiar municipio seleccionado
    this.myform.patchValue({ municipioId: null });
    
    if (departamentoId) {
      this.departamentoSeleccionado = this.departamentosList.find(d => d.id == departamentoId) || null;
      this.cargarMunicipios();
    } else {
      this.departamentoSeleccionado = null;
      this.municipiosListFiltrados = [];
    }
  }

  filtrarMunicipios(): void {
    if (this.departamentoSeleccionado) {
      this.municipiosListFiltrados = this.municipiosList.filter(
        m => m.departamento?.id === this.departamentoSeleccionado?.id
      );
    } else {
      this.municipiosListFiltrados = [];
    }
  }



  setRolesDisponibles(): void {
    switch (this.currentUserRole) {
      case 'ROOT':
        this.rolesDisponibles = ['ROOT', 'ADMINISTRADOR', 'CANDIDATO', 'TESTIGO'];
        break;
      case 'CANDIDATO':
        this.rolesDisponibles = ['ADMINISTRADOR', 'TESTIGO'];
        break;
      case 'ADMINISTRADOR':
        this.rolesDisponibles = ['TESTIGO'];
        break;
      default:
        this.rolesDisponibles = [];
    }
  }



  onSave(){
    
    if(this.myform.invalid){
      this.myform.markAllAsTouched();
      return;
    }

    const nuevoUsuario: Usuario = {
      nombre: this.myform.value.nombre ?? '',
      apellido: this.myform.value.apellido ?? '',
      cedula: this.myform.value.cedula ?? '',
      email: this.myform.value.email ?? '',
      rol: this.myform.value.rol ?? '',
      activo: this.myform.value.activo ?? true,
      password: this.myform.value.password ?? '',
      candidato: {
        id: this.myform.value.candidatoId ?? ''
      },

      departamento:  {
        id: this.myform.get('departamentoId')?.value ?? ''
      },
      municipio:  {
        id: this.myform.get('municipioId')?.value ?? ''
      },
    };
    
    this.usuarioService.crearUsuario(nuevoUsuario).subscribe({
      next: (respuesta) => {
        alert('Usuario creado exitosamente');
        this.listarUsuariosComponente?.listarAction();
        this.snCandidato.set(true);
        this.myform.reset({
          nombre:   '',
          apellido: '',
          cedula: '',
          email:    '',
          password: '',
          rol:      '',
          activo: true,
          candidatoId: '',
          departamentoId: null,
          municipioId: null
        });

        this.ngOnInit();
      },
      error: (err) => {
        console.error('Error al crear el usuario:', err);
        alert('Error al crear el usuario: ' + (err.error?.error || 'Error desconocido'));
      }
    });
  }

}