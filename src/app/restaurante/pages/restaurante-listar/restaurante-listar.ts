import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { Restaurante } from '../../interfaces/restaurante.interface';

@Component({
  selector: 'app-restaurante-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurante-listar.html',
})
export class RestauranteListarPageComponent implements OnInit {
  private readonly restauranteService = inject(RestauranteService);
  private readonly router = inject(Router);

  public restaurantes: Restaurante[] = [];
  public cargando: boolean = false;

  ngOnInit(): void {
    this.cargarRestaurantes();
  }

  cargarRestaurantes(): void {
    this.cargando = true;
    this.restauranteService.obtenerTodos().subscribe({
      next: (data) => {
        this.restaurantes = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar restaurantes:', err);
        this.cargando = false;
      },
    });
  }

  editar(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/restaurante/registrar'], { queryParams: { id } });
  }

  configurarBranding(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/restaurante/branding'], { queryParams: { id } });
  }

  desactivar(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea desactivar este restaurante?')) return;
    this.restauranteService.desactivar(id).subscribe({
      next: () => {
        alert('Restaurante desactivado');
        this.cargarRestaurantes();
      },
      error: (err) => {
        alert('Error: ' + (err.error?.error || 'No se pudo desactivar'));
      },
    });
  }
}
