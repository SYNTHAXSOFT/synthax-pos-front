import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../interfaces/usuario.interface';

// Roles del POS — sincronizados con el enum Rol.java del backend
const ROLES_POS = ['ROOT', 'PROPIETARIO', 'ADMINISTRADOR', 'CAJERO', 'MESERO', 'DOMICILIARIO'];

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
        alert('Error al cargar el usuario');
        this.router.navigate(['/synthax-pos/usuario/listar']);
      },
    });
  }

  actualizarUsuario(): void {
    if (!this.usuario.nombre || !this.usuario.cedula) {
      alert('Debe completar todos los campos requeridos');
      return;
    }
    this.usuarioService.actualizar(this.usuarioId, this.usuario).subscribe({
      next: () => {
        alert('Usuario actualizado exitosamente');
        this.router.navigate(['/synthax-pos/usuario/listar']);
      },
      error: (err) => {
        alert('Error al actualizar el usuario: ' + (err.error?.error ?? 'Error desconocido'));
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/synthax-pos/usuario/listar']);
  }
}
