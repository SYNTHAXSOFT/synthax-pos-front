import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TipoPedidoService } from '../../services/tipo-pedido.service';
import { TipoPedido } from '../../interfaces/tipo-pedido.interface';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-tipo-pedido-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipo-pedido-listar.html',
  styleUrls: ['../../../shared/styles/spx-geo.css'],
})
export class TipoPedidoListarPageComponent implements OnInit {
  private readonly tipoPedidoService = inject(TipoPedidoService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  public tiposPedido: TipoPedido[] = [];
  public cargando: boolean = false;
  public restauranteId?: number;
  public searchTerm: string = '';

  get tiposPedidoFiltrados(): TipoPedido[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.tiposPedido;
    return this.tiposPedido.filter(t =>
      t.nombre.toLowerCase().includes(term) ||
      t.codigo.toLowerCase().includes(term)
    );
  }

  get totalActivos(): number {
    return this.tiposPedido.filter(t => t.activo).length;
  }

  get totalInactivos(): number {
    return this.tiposPedido.filter(t => !t.activo).length;
  }

  ngOnInit(): void {
    this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    this.cargarTiposPedido();
  }

  cargarTiposPedido(): void {
    this.cargando = true;
    this.tipoPedidoService.obtenerTodos().subscribe({
      next: (data) => {
        this.tiposPedido = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar tipos de pedido:', err);
        this.cargando = false;
      },
    });
  }

  desactivar(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea desactivar este tipo de pedido?')) return;
    this.tipoPedidoService.desactivar(id).subscribe({
      next: () => {
        alert('Tipo de pedido desactivado');
        this.cargarTiposPedido();
      },
      error: (err) => {
        console.error('Error al desactivar:', err);
        alert('Error al desactivar el tipo de pedido');
      },
    });
  }

  editar(id?: number): void {
    if (!id) return;
    this.router.navigate(['/synthax-pos/tipo-pedido/registrar'], { queryParams: { id } });
  }
}
