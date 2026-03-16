import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { Restaurante } from '../../interfaces/restaurante.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-restaurante-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurante-listar.html',
  styleUrls: ['./restaurante-listar.css'],
})
export class RestauranteListarPageComponent implements OnInit {
  private readonly restauranteService = inject(RestauranteService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  public restaurantes: Restaurante[] = [];
  public cargando: boolean = false;

  get totalActivos(): number   { return this.restaurantes.filter(r => r.activo).length; }
  get totalInactivos(): number { return this.restaurantes.filter(r => !r.activo).length; }

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

  async desactivar(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Desea desactivar este restaurante?', type: 'danger' });
    if (!ok) return;
    this.restauranteService.desactivar(id).subscribe({
      next: () => {
        this.toastService.success('Restaurante desactivado');
        this.cargarRestaurantes();
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error || 'No se pudo desactivar'));
      },
    });
  }
}
