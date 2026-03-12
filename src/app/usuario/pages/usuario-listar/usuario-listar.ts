import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Usuario } from '../../interfaces/usuario.interface';

@Component({
  selector: 'app-listar-page',
  imports: [CommonModule],
  templateUrl: './usuario-listar.html',
})
export class ListarPage implements OnInit {

  constructor(private router: Router) {}

  private readonly usuarioService = inject(UsuarioService);
  private readonly authService    = inject(AuthService);

  isLoading    = signal(false);
  isError      = signal(false);
  errorMessage = signal<string | null>(null);
  usuariosList = signal<Usuario[]>([]);
  currentUserRole = '';

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole() ?? '';
    this.listarAction();
  }

  listarAction(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.isError.set(false);

    this.usuarioService.listarUsuariosFiltrados().subscribe({
      next: (data) => { this.isLoading.set(false); this.usuariosList.set(data); },
      error: (err) => {
        this.isLoading.set(false);
        this.isError.set(true);
        this.errorMessage.set(err.error?.error ?? 'Error al cargar usuarios');
      },
    });
  }

  puedeModificar(usuario: Usuario): boolean {
    // ROOT puede modificar a cualquiera; ADMINISTRADOR solo a roles operativos
    if (this.currentUserRole === 'ROOT') return true;
    if (this.currentUserRole === 'ADMINISTRADOR') {
      return ['CAJERO', 'MESERO', 'DOMICILIARIO'].includes(usuario.rol);
    }
    return false;
  }

  activarInactivar(usuario: Usuario): void {
    if (!this.puedeModificar(usuario)) {
      alert('No tienes permisos para modificar este usuario');
      return;
    }
    const accion = usuario.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro de ${accion} este usuario?`)) return;

    usuario.activo = !usuario.activo;
    this.usuarioService.activarInactivar(usuario).subscribe({
      next: () => this.listarAction(),
      error: (err) => {
        usuario.activo = !usuario.activo; // revertir
        alert('Error: ' + (err.error?.error ?? 'Error desconocido'));
      },
    });
  }

  editar(id: number): void {
    this.router.navigate(['/synthax-pos/usuario/actualizar', id]);
  }
}
