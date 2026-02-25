import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../interfaces/usuario.interface';

@Component({
  selector: 'app-actualizar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actualizar-page.html'
})
export class ActualizarUsuarioPageComponent implements OnInit {

  selectedRol = '';
  selectedCandidato = '';
  candidatos: any[] = [];
  usuario: Usuario = {
    
    nombre:   '',
    apellido: '',
    email:    '',
    password: '',
    rol:      '',
    cedula:   '',
    candidato: {id: ''},
    activo: true
   
  };

  cargando = true;
  
  usuarioId: number = 0;

  constructor(
    private usuarioService: UsuarioService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    
    const idParam = this.route.snapshot.paramMap.get('id');
    this.usuarioId = idParam ? Number(idParam) : 0;
    this.cargarUsuario();
    this.cargarCandidatos();
  }

  cargarCandidatos(){
      this.usuarioService.listarCandidatos().subscribe(data => {
      this.candidatos = data;
    });
  }
  cargarUsuario() {
    this.usuarioService.obtenerPorId(this.usuarioId).subscribe({
      next: (data) => {
        this.usuario = data;
        this.cargando = false;

        if (!this.usuario.candidato) {
        this.usuario.candidato = { id: '', nombre: '' };
      }
      },
      error: (error) => {
        alert('Error al cargar el usuario');
        this.router.navigate(['synthax-votos/usuario/listar']);
      }
    });
  }

  actualizarUsuario() {
    if (!this.usuario.nombre) {
      alert('Debe completar todos los campos');
      return;
    }
    this.usuario.candidato.id = this.selectedCandidato;
    this.usuarioService.actualizar(this.usuarioId, this.usuario).subscribe({
      next: () => {
        alert('Usuario actualizado exitosamente');
        this.router.navigate(['synthax-votos/usuario/actualizar']);
      },
      error: (err) => {
        alert('Error al actualizar el usuario');
      }
    });
  }

  cancelar() {
    this.router.navigate(['synthax-votos/usuario/registrar']);
  }
}