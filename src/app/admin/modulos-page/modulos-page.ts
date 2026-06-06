import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RestauranteService } from '../../restaurante/services/restaurante.service';
import { Restaurante } from '../../restaurante/interfaces/restaurante.interface';
import { ToastService } from '../../shared/services/toast.service';

interface ModuloItem {
  modulo: string;
  habilitado: boolean;
  descripcion: string;
}

@Component({
  selector: 'app-modulos-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modulos-page.html',
  styleUrls: ['./modulos-page.css'],
})
export class ModulosPageComponent implements OnInit {
  private readonly http               = inject(HttpClient);
  private readonly restauranteService = inject(RestauranteService);
  private readonly toastService       = inject(ToastService);

  restaurantes: Restaurante[] = [];
  restauranteSeleccionado: Restaurante | null = null;
  modulos: ModuloItem[] = [];
  cargandoRestaurantes = false;
  cargandoModulos = false;
  guardando = false;

  ngOnInit(): void {
    this.cargarRestaurantes();
  }

  cargarRestaurantes(): void {
    this.cargandoRestaurantes = true;
    this.restauranteService.obtenerTodos().subscribe({
      next: (data) => {
        this.restaurantes = data;
        this.cargandoRestaurantes = false;
      },
      error: () => {
        this.toastService.error('Error al cargar restaurantes');
        this.cargandoRestaurantes = false;
      },
    });
  }

  seleccionarRestaurante(restaurante: Restaurante): void {
    this.restauranteSeleccionado = restaurante;
    this.cargarModulos(restaurante.id!);
  }

  cargarModulos(restauranteId: number): void {
    this.cargandoModulos = true;
    this.modulos = [];
    this.http.get<ModuloItem[]>(`${environment.URL}/modulos/restaurante/${restauranteId}`).subscribe({
      next: (data) => {
        this.modulos = data;
        this.cargandoModulos = false;
      },
      error: () => {
        this.toastService.error('Error al cargar módulos');
        this.cargandoModulos = false;
      },
    });
  }

  toggleModulo(modulo: ModuloItem): void {
    modulo.habilitado = !modulo.habilitado;
  }

  guardar(): void {
    if (!this.restauranteSeleccionado?.id) return;
    const cambios: Record<string, boolean> = {};
    for (const m of this.modulos) {
      cambios[m.modulo] = m.habilitado;
    }
    this.guardando = true;
    this.http.put<ModuloItem[]>(
      `${environment.URL}/modulos/restaurante/${this.restauranteSeleccionado.id}`,
      cambios
    ).subscribe({
      next: (data) => {
        this.modulos = data;
        this.guardando = false;
        this.toastService.success('Módulos actualizados correctamente');
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error || 'No se pudo guardar'));
        this.guardando = false;
      },
    });
  }

  volver(): void {
    this.restauranteSeleccionado = null;
    this.modulos = [];
  }
}
