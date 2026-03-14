import { Component, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InsumoService } from '../../services/insumo.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Insumo } from '../../interfaces/insumo.interface';

@Component({
  selector: 'app-insumo-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insumo-listar.html',
})
export class InsumoListarPageComponent implements OnInit {
  private readonly insumoService = inject(InsumoService);
  private readonly authService   = inject(AuthService);
  private readonly router = inject(Router);

  /** Si se proporciona explicitamente, filtra los insumos por restaurante.
   *  Si no, se auto-completa con el restaurante del usuario logueado. */
  @Input() restauranteId?: number;

  public insumos: Insumo[] = [];
  public cargando: boolean = false;

  ngOnInit(): void {
    // Auto-asignar restaurante desde el usuario logueado si no viene como @Input
    if (!this.restauranteId) {
      this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    }
    this.cargarInsumos();
  }

  cargarInsumos(): void {
    this.cargando = true;
    const obs = this.restauranteId
      ? this.insumoService.obtenerPorRestaurante(this.restauranteId)
      : this.insumoService.obtenerTodos();

    obs.subscribe({
      next: (data) => {
        this.insumos = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar insumos:', err);
        this.cargando = false;
      },
    });
  }

  editar(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/insumo/registrar'], { queryParams: { id } });
  }

  desactivar(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea desactivar este insumo?')) return;
    this.insumoService.desactivar(id).subscribe({
      next: () => {
        alert('Insumo desactivado');
        this.cargarInsumos();
      },
      error: (err) => alert('Error: ' + (err.error?.error || 'No se pudo desactivar')),
    });
  }

  getStockClass(stock?: number): string {
    if (stock == null)  return 'text-muted';
    if (stock === 0)    return 'text-danger fw-bold';
    if (stock <= 5)     return 'text-warning fw-bold';
    return 'text-success fw-bold';
  }
}
