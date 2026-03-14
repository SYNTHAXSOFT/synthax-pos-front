import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MesaService } from '../../services/mesa.service';
import { Mesa } from '../../interfaces/mesa.interface';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-mesa-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mesa-listar.html',
})
export class MesaListarPageComponent implements OnInit {
  private readonly mesaService = inject(MesaService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  public mesas: Mesa[] = [];
  public cargando: boolean = false;
  public restauranteId?: number;

  ngOnInit(): void {
    this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    this.cargarMesas();
  }

  cargarMesas(): void {
    this.cargando = true;
    this.mesaService.obtenerTodos().subscribe({
      next: (data) => {
        this.mesas = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar mesas:', err);
        this.cargando = false;
      },
    });
  }

  desactivar(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea desactivar esta mesa?')) return;
    this.mesaService.desactivar(id).subscribe({
      next: () => {
        alert('Mesa desactivada');
        this.cargarMesas();
      },
      error: (err) => {
        console.error('Error al desactivar:', err);
        alert('Error al desactivar la mesa');
      },
    });
  }

  editar(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/mesa/registrar'], { queryParams: { id } });
  }
}
