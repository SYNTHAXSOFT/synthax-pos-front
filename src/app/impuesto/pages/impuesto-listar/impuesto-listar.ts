import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ImpuestoService } from '../../services/impuesto.service';
import { Impuesto } from '../../interfaces/impuesto.interface';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-impuesto-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './impuesto-listar.html',
  styleUrls: ['../../../shared/styles/spx-geo.css'],
})
export class ImpuestoListarPageComponent implements OnInit {
  private readonly impuestoService = inject(ImpuestoService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  public impuestos: Impuesto[] = [];
  public cargando: boolean = false;
  public restauranteId?: number;
  public searchTerm: string = '';

  get impuestosFiltrados(): Impuesto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.impuestos;
    return this.impuestos.filter(i =>
      i.descripcion.toLowerCase().includes(term) ||
      String(i.porcentajeImpuesto).includes(term)
    );
  }

  get totalActivos(): number {
    return this.impuestos.filter(i => i.estado === 'ACTIVO').length;
  }

  get totalInactivos(): number {
    return this.impuestos.filter(i => i.estado !== 'ACTIVO').length;
  }

  ngOnInit(): void {
    this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    this.cargarImpuestos();
  }

  cargarImpuestos(): void {
    this.cargando = true;
    this.impuestoService.obtenerTodos().subscribe({
      next: (data) => {
        this.impuestos = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar impuestos:', err);
        this.cargando = false;
      },
    });
  }

  desactivar(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea desactivar este impuesto?')) return;
    this.impuestoService.desactivar(id).subscribe({
      next: () => {
        alert('Impuesto desactivado');
        this.cargarImpuestos();
      },
      error: (err) => {
        console.error('Error al desactivar:', err);
        alert('Error al desactivar el impuesto');
      },
    });
  }

  editar(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/impuesto/registrar'], { queryParams: { id } });
  }
}
