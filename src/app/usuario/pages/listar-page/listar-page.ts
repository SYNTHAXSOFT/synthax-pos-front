import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ɵInternalFormsSharedModule, ReactiveFormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../../auth/services/auth.service'; 
import { Usuario } from '../../interfaces/usuario.interface';

@Component({
  selector: 'app-listar-page',
  imports: [ɵInternalFormsSharedModule, ReactiveFormsModule],
  templateUrl: './listar-page.html',
})

export class ListarPage implements OnInit {


  constructor(private router: Router){}

  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);  

  isLoading = signal(false);
  isError = signal(false);
  errorMessage = signal<string | null>(null);

  usuariosList = signal<Usuario[]>([]);
  currentUserRole: string = ''; 

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole() || '';
    this.listarAction();
  }

  listarAction() {
  if (this.isLoading()) return;

  this.isLoading.set(true);
  this.isError.set(false);
  this.errorMessage.set(null);

  // 👇 CAMBIAR DE listarUsuarios() a listarUsuariosFiltrados()
  this.usuarioService.listarUsuariosFiltrados().subscribe({
    next: (usuariosResponse) => {
      this.isLoading.set(false);
      this.usuariosList.set(usuariosResponse);
    },
    error: (error) => {
      this.isLoading.set(false);
      this.isError.set(true);
      this.errorMessage.set(error.error?.error || 'Error al cargar usuarios');
      this.usuariosList.set([]);
    }
  });
}

  filtrarUsuariosPorRol(usuarios: Usuario[]): Usuario[] {
    switch (this.currentUserRole) {
      case 'ROOT':
        // ROOT ve todos los usuarios
        return usuarios;
      
      case 'CANDIDATO':
        // CANDIDATO solo ve ADMINISTRADOR y TESTIGO
        return usuarios.filter(u => 
          u.rol === 'ADMINISTRADOR' || u.rol === 'TESTIGO'
        );
      
      case 'ADMINISTRADOR':
        // ADMINISTRADOR solo ve TESTIGO
        return usuarios.filter(u => u.rol === 'TESTIGO');
      
      default:
        // Por defecto no muestra nada
        return [];
    }
  }

  puedeModificar(usuario: Usuario): boolean {
    switch (this.currentUserRole) {
      case 'ROOT':
        return true; // ROOT puede modificar a todos
      
      case 'CANDIDATO':
        // CANDIDATO puede modificar ADMINISTRADOR y TESTIGO
        return usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'TESTIGO';
      
      case 'ADMINISTRADOR':
        // ADMINISTRADOR puede modificar TESTIGO
        return usuario.rol === 'TESTIGO';
      
      default:
        return false;
    }
  }

  activarInactivarAction(usuario: Usuario) {
    if (this.isLoading()) return;

    if (!this.puedeModificar(usuario)) {
      alert('No tienes permisos para modificar este usuario');
      return;
    }

    const accion = usuario.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Está seguro de ${accion} este usuario?`)) {
      return;
    }

    this.isLoading.set(true);
    this.isError.set(false);

    usuario.activo = !usuario.activo;

    this.usuarioService.activarInactivarUsuario(usuario).subscribe({
      next: (usuariosResponse) => {
        this.isLoading.set(false);
        this.listarAction();
      },
      error: (error) => {
        this.isLoading.set(false);
        this.isError.set(true);
        this.errorMessage.set(error.error?.error || 'Error al actualizar usuario');
        // Revertir el cambio si falla
        usuario.activo = !usuario.activo;
      }
    });
  }
  editar(id: number): void {
    this.router.navigate(['/synthax-votos/usuario/actualizar', id]);
  }

}
