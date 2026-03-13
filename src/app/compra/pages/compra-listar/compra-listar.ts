import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompraService } from '../../services/compra.service';
import { Compra } from '../../interfaces/compra.interface';

@Component({
  selector: 'app-compra-listar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compra-listar.html',
})
export class CompraListarPageComponent implements OnInit {
  private readonly compraService = inject(CompraService);

  /** Filtra por restaurante si se provee */
  @Input() restauranteId?: number;

  public compras: Compra[] = [];
  public cargando: boolean = false;

  ngOnInit(): void {
    this.cargarCompras();
  }

  cargarCompras(): void {
    this.cargando = true;
    const obs = this.restauranteId
      ? this.compraService.obtenerPorRestaurante(this.restauranteId)
      : this.compraService.obtenerTodas();

    obs.subscribe({
      next: (data) => {
        this.compras = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar compras:', err);
        this.cargando = false;
      },
    });
  }

  desactivar(id?: number): void {
    if (!id) return;
    if (!confirm('¿Desea anular esta compra? El stock NO se revertirá automáticamente.')) return;
    this.compraService.desactivar(id).subscribe({
      next: () => {
        alert('Compra anulada');
        this.cargarCompras();
      },
      error: (err) => alert('Error: ' + (err.error?.error || 'No se pudo anular')),
    });
  }

  totalCompras(): number {
    return this.compras
      .filter((c) => c.activo)
      .reduce((acc, c) => acc + (c.valorTotal ?? 0), 0);
  }
}
