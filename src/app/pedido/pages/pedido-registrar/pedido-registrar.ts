import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { PedidoRequest } from '../../interfaces/pedido.interface';
import { VentaService } from '../../../venta/services/venta.service';
import { ProductoService } from '../../../producto/services/producto.service';
import { Venta } from '../../../venta/interfaces/venta.interface';
import { Producto } from '../../../producto/interfaces/producto.interface';
import { PedidoListarPageComponent } from '../pedido-listar/pedido-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-pedido-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PedidoListarPageComponent],
  templateUrl: './pedido-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class PedidoRegistrarPageComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly pedidoService  = inject(PedidoService);
  private readonly ventaService   = inject(VentaService);
  private readonly productoService= inject(ProductoService);
  private readonly route          = inject(ActivatedRoute);
  private readonly toastService   = inject(ToastService);

  @ViewChild(PedidoListarPageComponent) listarComponent?: PedidoListarPageComponent;

  public ventasAbiertas: Venta[]    = [];
  public productos:       Producto[] = [];
  public ventaSeleccionada?: Venta;
  public ventaIdFijo?: number;      // cuando viene desde la lista de ventas

  public myForm: FormGroup = this.fb.group({
    ventaId:     [null, [Validators.required]],
    productoId:  [null, [Validators.required]],
    cantidad:    [1,   [Validators.required, Validators.min(0.01)]],
    observacion: [''],
  });

  ngOnInit(): void {
    this.cargarCatalogos();

    // Si llega ?ventaId=X desde la lista de ventas, preseleccionamos la venta
    this.route.queryParams.subscribe((params) => {
      const vid = params['ventaId'];
      if (vid) {
        this.ventaIdFijo = +vid;
        this.myForm.get('ventaId')?.setValue(this.ventaIdFijo);
        this.myForm.get('ventaId')?.disable();   // no se puede cambiar
        this.onVentaChange(this.ventaIdFijo);
      }
    });
  }

  cargarCatalogos(): void {
    this.ventaService.obtenerAbiertas().subscribe({ next: (d) => this.ventasAbiertas = d });
    this.productoService.obtenerActivos().subscribe({ next: (d) => this.productos = d });
  }

  onVentaChange(id: number): void {
    this.ventaSeleccionada = this.ventasAbiertas.find((v) => v.id === id);
    // Recargamos el listar-component con la nueva venta
    if (this.listarComponent) {
      this.listarComponent.ventaId = id;
      this.listarComponent.cargarPedidos();
    }
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const v = this.myForm.getRawValue();   // getRawValue incluye campos disabled
    const payload: PedidoRequest = {
      cantidad:    v.cantidad,
      observacion: v.observacion || undefined,
      activo:      true,
      producto:    { id: v.productoId },
      venta:       { id: v.ventaId },
    };

    this.pedidoService.crear(payload).subscribe({
      next: () => {
        this.toastService.success('Ítem agregado al pedido');
        // Reseteamos solo producto, cantidad y observación; mantenemos venta
        this.myForm.patchValue({ productoId: null, cantidad: 1, observacion: '' });
        this.listarComponent?.cargarPedidos();
      },
      error: (err) => {
        console.error('Error:', err);
        this.toastService.error('Error al agregar ítem: ' + (err.error?.error || 'Error desconocido'));
      },
    });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field]?.errors && this.myForm.controls[field]?.touched;
  }

  getFieldError(field: string): string | null {
    if (!this.myForm.controls[field]) return null;
    const errors = this.myForm.controls[field].errors || {};
    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required': return 'Este campo es requerido';
        case 'min':      return `El valor mínimo es ${errors['min'].min}`;
      }
    }
    return null;
  }

  /** Precio del producto seleccionado */
  getPrecioSeleccionado(): number {
    const productoId = this.myForm.get('productoId')?.value;
    const p = this.productos.find((x) => x.id === productoId);
    return p?.precio ?? 0;
  }

  /** Subtotal del ítem que se está ingresando */
  getSubtotalActual(): number {
    const cantidad = this.myForm.get('cantidad')?.value ?? 0;
    return cantidad * this.getPrecioSeleccionado();
  }
}
