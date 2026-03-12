import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TipoPedidoService } from '../../services/tipo-pedido.service';
import { TipoPedido } from '../../interfaces/tipo-pedido.interface';

@Component({
  selector: 'app-tipo-pedido-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tipo-pedido-listar.html',
})
export class TipoPedidoListarPageComponent implements OnInit {
  private readonly tipoPedidoService = inject(TipoPedidoService);
  private readonly router = inject(Router);

  public tiposPedido: TipoPedido[] = [];
  public cargando: boolean = false;

  ngOnInit(): void {
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
