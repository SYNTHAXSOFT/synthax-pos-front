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
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-pedido-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PedidoListarPageComponent],
  templateUrl: './pedido-registrar.html',
  styleUrls: ['./pedido-registrar.css'],
})
export class PedidoRegistrarPageComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly pedidoService  = inject(PedidoService);
  private readonly ventaService   = inject(VentaService);
  private readonly productoService= inject(ProductoService);
  private readonly route          = inject(ActivatedRoute);
  private readonly toastService   = inject(ToastService);
  private readonly authService    = inject(AuthService);

  @ViewChild(PedidoListarPageComponent) listarComponent?: PedidoListarPageComponent;

  public ventasAbiertas:  Venta[]    = [];
  public productos:        Producto[] = [];
  public ventaSeleccionada?: Venta;
  public ventaIdFijo?: number;

  // ── Estado por producto ───────────────────────────────────────────────────
  private obsMap      = new Map<number, string>();
  private cantMap     = new Map<number, number>();
  private obsExpanded = new Set<number>();
  public  agregando   = new Set<number>();

  public myForm: FormGroup = this.fb.group({
    ventaId: [null, [Validators.required]],
  });

  // ── Getters ───────────────────────────────────────────────────────────────

  /** COCINERO y DOMICILIARIO solo pueden ver los ítems, no agregar */
  get soloLectura(): boolean {
    const rol = this.authService.getUserRole() ?? '';
    return ['COCINERO', 'DOMICILIARIO'].includes(rol);
  }

  /** Cuando la venta ya está PAGADA, no se pueden agregar ni modificar pedidos */
  get ventaPagada(): boolean {
    return this.ventaSeleccionada?.estado === 'PAGADA';
  }

  get ventaIdActual(): number | null {
    return this.myForm.getRawValue().ventaId ?? null;
  }

  /** Icono según tipo de pedido */
  getTipoIcon(nombre?: string): string {
    const n = (nombre ?? '').toUpperCase();
    if (n.includes('DOMICILIO')) return 'fa-solid fa-motorcycle';
    if (n.includes('LLEVAR'))   return 'fa-solid fa-bag-shopping';
    return 'fa-solid fa-utensils';
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const vid = params['ventaId'];
      if (vid) {
        this.ventaIdFijo = +vid;
        this.myForm.get('ventaId')?.setValue(this.ventaIdFijo);
        this.myForm.get('ventaId')?.disable();
      }
    });
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.ventaService.obtenerAbiertas().subscribe({
      next: (d) => {
        this.ventasAbiertas = d;
        if (this.ventaIdFijo) {
          this.ventaSeleccionada = d.find(v => v.id === this.ventaIdFijo);
          // Si la venta no está en abiertas (ej. ya PAGADA), la cargamos por ID
          if (!this.ventaSeleccionada) {
            this.ventaService.obtenerPorId(this.ventaIdFijo).subscribe({
              next: (v) => { this.ventaSeleccionada = v; },
            });
          }
          this.onVentaChange(this.ventaIdFijo);
        }
      },
    });
    this.productoService.obtenerActivos().subscribe({ next: (d) => this.productos = d });
  }

  onVentaChange(id: number): void {
    this.ventaSeleccionada = this.ventasAbiertas.find((v) => v.id === id);
    if (this.listarComponent) {
      this.listarComponent.ventaId = id;
      this.listarComponent.cargarPedidos();
    }
  }

  // ── Helpers por producto ──────────────────────────────────────────────────

  toggleObs(id: number): void {
    if (this.obsExpanded.has(id)) { this.obsExpanded.delete(id); }
    else                          { this.obsExpanded.add(id); }
  }

  obsVisible(id: number): boolean { return this.obsExpanded.has(id); }
  getObs(id: number): string      { return this.obsMap.get(id) ?? ''; }
  setObs(id: number, ev: Event): void {
    this.obsMap.set(id, (ev.target as HTMLTextAreaElement).value);
  }

  getCantidad(id: number): number { return this.cantMap.get(id) ?? 1; }

  incrementar(id: number): void {
    this.cantMap.set(id, this.getCantidad(id) + 1);
  }

  decrementar(id: number): void {
    const v = this.getCantidad(id);
    if (v > 1) this.cantMap.set(id, v - 1);
  }

  // ── Agregar pedido ────────────────────────────────────────────────────────

  agregarProducto(prod: Producto): void {
    const ventaId = this.ventaIdActual;
    if (!ventaId) {
      this.toastService.warning('Selecciona una venta antes de agregar productos.');
      return;
    }

    const id = prod.id!;
    this.agregando.add(id);

    const payload: PedidoRequest = {
      cantidad:    this.getCantidad(id),
      observacion: this.getObs(id) || undefined,
      producto:    { id },
      venta:       { id: ventaId },
    };

    this.pedidoService.crear(payload).subscribe({
      next: () => {
        this.toastService.success(`${prod.nombre} agregado al pedido`);
        this.cantMap.set(id, 1);
        this.obsMap.delete(id);
        this.obsExpanded.delete(id);
        this.agregando.delete(id);
        this.listarComponent?.cargarPedidos();
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido'));
        this.agregando.delete(id);
      },
    });
  }
}
