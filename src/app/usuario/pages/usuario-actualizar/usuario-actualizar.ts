import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../interfaces/usuario.interface';
import { ToastService } from '../../../shared/services/toast.service';

// Roles del POS — ROOT excluido: no se puede asignar mediante edición
const ROLES_POS = ['PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO', 'COCINERO', 'DOMICILIARIO', 'CLIENTE'];

@Component({
  selector: 'app-actualizar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-actualizar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class ActualizarUsuarioPageComponent implements OnInit {

  public readonly rolesPOS = ROLES_POS;

  usuario: Usuario = {
    nombre:   '',
    apellido: '',
    email:    '',
    password: '',
    rol:      '',
    cedula:   '',
    activo:   true,
  };

  cargando  = true;
  usuarioId = 0;
  private readonly toastService = inject(ToastService);

  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly route:          ActivatedRoute,
    private readonly router:         Router,
  ) {}

  ngOnInit(): void {
    const idParam  = this.route.snapshot.paramMap.get('id');
    this.usuarioId = idParam ? Number(idParam) : 0;
    this.cargarUsuario();
  }

  cargarUsuario(): void {
    this.usuarioService.obtenerPorId(this.usuarioId).subscribe({
      next: (data) => {
        this.usuario  = data;
        this.cargando = false;
      },
      error: () => {
        this.toastService.error('Error al cargar el usuario');
        this.router.navigate(['/synthax-pos/usuario/listar']);
      },
    });
  }

  actualizarUsuario(): void {
    if (!this.usuario.nombre || !this.usuario.cedula) {
      this.toastService.warning('Debe completar todos los campos requeridos');
      return;
    }
    this.usuarioService.actualizar(this.usuarioId, this.usuario).subscribe({
      next: () => {
        this.toastService.success('Usuario actualizado exitosamente');
        this.router.navigate(['/synthax-pos/usuario/listar']);
      },
      error: (err) => {
        const msg = err.error?.error
                 ?? err.error?.message
                 ?? err.message
                 ?? `HTTP ${err.status ?? ''}`.trim()
                 ?? 'Error desconocido';
        this.toastService.error('Error al actualizar el usuario: ' + msg);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/synthax-pos/usuario/listar']);
  }
}
