import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompraService } from '../../services/compra.service';
import { CompraRequest } from '../../interfaces/compra.interface';
import { RestauranteService } from '../../../restaurante/services/restaurante.service';
import { InsumoService } from '../../../insumo/services/insumo.service';
import { Restaurante } from '../../../restaurante/interfaces/restaurante.interface';
import { Insumo } from '../../../insumo/interfaces/insumo.interface';
import { CompraListarPageComponent } from '../compra-listar/compra-listar';

@Component({
  selector: 'app-compra-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CompraListarPageComponent],
  templateUrl: './compra-registrar.html',
})
export class CompraRegistrarPageComponent implements OnInit {
  private readonly fb                 = inject(FormBuilder);
  private readonly compraService      = inject(CompraService);
  private readonly restauranteService = inject(RestauranteService);
  private readonly insumoService      = inject(InsumoService);

  @ViewChild(CompraListarPageComponent) listarComponent?: CompraListarPageComponent;

  public restaurantes: Restaurante[] = [];
  public insumos:      Insumo[]      = [];

  public myForm: FormGroup = this.fb.group({
    codigo:        ['', [Validators.required, Validators.minLength(2)]],
    restauranteId: [null, [Validators.required]],
    insumoId:      [null, [Validators.required]],
    cantidad:      [null, [Validators.required, Validators.min(0.01)]],
    valorUnidad:   [null, [Validators.required, Validators.min(1)]],
  });

  /** Subtotal calculado en tiempo real */
  get subtotal(): number {
    const q = this.myForm.value.cantidad   ?? 0;
    const p = this.myForm.value.valorUnidad ?? 0;
    return q * p;
  }

  ngOnInit(): void {
    this.restauranteService.obtenerActivos().subscribe({ next: (d) => this.restaurantes = d });
  }

  /** Al cambiar de restaurante, recarga los insumos filtrados */
  onRestauranteChange(): void {
    const rId = this.myForm.value.restauranteId;
    this.insumos = [];
    this.myForm.patchValue({ insumoId: null });
    if (rId) {
      this.insumoService.obtenerActivosPorRestaurante(rId).subscribe({
        next: (d) => this.insumos = d,
      });
    }
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }
    const v = this.myForm.value;
    const payload: CompraRequest = {
      codigo:      v.codigo,
      valorUnidad: v.valorUnidad,
      cantidad:    v.cantidad,
      valorTotal:  this.subtotal,
      insumo:      { id: v.insumoId },
      restaurante: { id: v.restauranteId },
      activo:      true,
    };

    this.compraService.crear(payload).subscribe({
      next: () => {
        alert('Compra registrada. Stock del insumo actualizado automáticamente.');
        this.myForm.reset();
        this.insumos = [];
        this.listarComponent?.cargarCompras();
      },
      error: (err) => alert('Error: ' + (err.error?.error || 'Error desconocido')),
    });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
