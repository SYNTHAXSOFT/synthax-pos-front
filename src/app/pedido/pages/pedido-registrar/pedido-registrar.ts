import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ModulosService } from '../../../shared/services/modulos.service';
import { MODULOS } from '../../../shared/constants/modulos.constants';

@Component({
  selector: 'app-pedido-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PedidoListarPageComponent],
  templateUrl: './pedido-registrar.html',
  styleUrls: ['./pedido-registrar.css'],
})
export class PedidoRegistrarPageComponent implements OnInit, OnDestroy {
  private readonly fb             = inject(FormBuilder);
  private readonly pedidoService  = inject(PedidoService);
  private readonly ventaService   = inject(VentaService);
  private readonly productoService= inject(ProductoService);
  private readonly route          = inject(ActivatedRoute);
  private readonly toastService   = inject(ToastService);
  private readonly authService    = inject(AuthService);
  readonly modulosService         = inject(ModulosService);
  readonly MODULOS                = MODULOS;

  @ViewChild(PedidoListarPageComponent) listarComponent?: PedidoListarPageComponent;

  public ventasAbiertas:  Venta[]    = [];
  public productos:        Producto[] = [];
  public ventaSeleccionada?: Venta;
  public ventaIdFijo?: number;

  /** Controla el modal del catálogo de productos */
  public modalCatalogoAbierto: boolean = false;

  /** Texto del buscador de productos dentro del modal */
  public filtroCatalogo: string = '';

  /** Productos filtrados según el texto de búsqueda */
  get productosFiltrados(): Producto[] {
    const term = this.filtroCatalogo.trim().toLowerCase();
    if (!term) return this.productos;
    return this.productos.filter(p =>
      p.nombre?.toLowerCase().includes(term) ||
      p.descripcion?.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term)
    );
  }

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

  /** True si el rol puede agregar productos */
  get puedeAgregar(): boolean {
    return !this.soloLectura && !this.ventaPagada && !!(this.ventaIdFijo || this.ventaIdActual);
  }

  /** Icono según tipo de pedido */
  getTipoIcon(nombre?: string): string {
    const n = (nombre ?? '').toUpperCase();
    if (n.includes('DOMICILIO')) return 'fa-solid fa-motorcycle';
    if (n.includes('LLEVAR'))   return 'fa-solid fa-bag-shopping';
    return 'fa-solid fa-utensils';
  }

  // ── Init / Destroy ────────────────────────────────────────────────────────

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

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  cargarCatalogos(): void {
    this.ventaService.obtenerAbiertas().subscribe({
      next: (d) => {
        this.ventasAbiertas = d;
        if (this.ventaIdFijo) {
          this.ventaSeleccionada = d.find(v => v.id === this.ventaIdFijo);
          if (!this.ventaSeleccionada) {
            this.ventaService.obtenerPorId(this.ventaIdFijo).subscribe({
              next: (v) => { this.ventaSeleccionada = v; },
            });
          }
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

  // ── Modal del catálogo ────────────────────────────────────────────────────

  abrirModalCatalogo(): void {
    this.filtroCatalogo = '';
    this.modalCatalogoAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModalCatalogo(): void {
    this.modalCatalogoAbierto = false;
    document.body.style.overflow = '';
    this.filtroCatalogo = '';
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

  // ── Imprimir Comanda ──────────────────────────────────────────────────────

  imprimirComanda(): void {
    const venta   = this.ventaSeleccionada;
    const pedidos = this.listarComponent?.pedidos ?? [];

    // Solo items activos (excluir cancelados y destruidos)
    const activos = pedidos.filter(p => !['CANCELADO', 'DESTRUIDO'].includes(p.estado ?? ''));

    if (activos.length === 0) {
      this.toastService.warning('No hay productos activos para imprimir en la comanda.');
      return;
    }

    const rest  = this.authService.getCurrentRestaurante();
    const ahora = new Date();
    const dd    = String(ahora.getDate()).padStart(2, '0');
    const mm    = String(ahora.getMonth() + 1).padStart(2, '0');
    const yy    = String(ahora.getFullYear()).slice(2);
    const hh    = String(ahora.getHours()).padStart(2, '0');
    const min   = String(ahora.getMinutes()).padStart(2, '0');
    const fechaHora = `${dd}/${mm}/${yy} ${hh}:${min}`;

    /* ── Mismo enfoque PRE/monospace que la tirilla ── */
    const W = 28;

    const trunc = (s: unknown, max: number): string =>
      String(s ?? '').replace(/[\n\r]/g, ' ').trim().slice(0, max);

    const center = (s: string): string => {
      const t = trunc(s, W);
      const pad = Math.floor((W - t.length) / 2);
      return ' '.repeat(pad) + t;
    };

    /* Fila etiqueta (13) | valor (15) = 28 */
    const lr = (label: string, value: string): string => {
      const MAX_R = 15, MAX_L = W - MAX_R; // 13
      return trunc(label, MAX_L).padEnd(MAX_L) +
             trunc(value, MAX_R).padStart(MAX_R);
    };

    const DIV  = '-'.repeat(W);
    const DIVB = '='.repeat(W);

    const restNombre = trunc(rest?.nombre ?? 'MOED', W);

    /* ── Construir líneas ── */
    const lines: string[] = [];

    lines.push(center('* COMANDA DE COCINA *'));
    lines.push(center(restNombre.toUpperCase()));
    lines.push(DIVB);

    // Meta
    lines.push(lr('Pedido #', String(venta?.id ?? '')));
    lines.push(lr('Tipo', trunc(venta?.tipoPedido?.nombre ?? '—', 15)));
    lines.push(lr('Hora', fechaHora));
    if (venta?.mesa?.nombre) lines.push(lr('Mesa', trunc(venta.mesa.nombre, 15)));

    // Instrucciones de la venta
    if (venta?.observacion) {
      lines.push(DIV);
      lines.push(center('INSTRUCCIONES:'));
      const obs = venta.observacion.replace(/[\n\r]/g, ' ').trim();
      for (let i = 0; i < obs.length; i += W) {
        lines.push(obs.slice(i, i + W));
      }
    }

    lines.push(DIVB);

    // Cabecera productos: nombre (22) | cant (6) = 28
    lines.push('Producto'.padEnd(22) + 'Cant'.padStart(6));
    lines.push(DIV);

    // Productos
    activos.forEach((p, i) => {
      const num     = String(i + 1) + '. ';
      const maxNom  = 22 - num.length;           // espacio para el nombre
      const nombre  = trunc(p.producto?.nombre ?? '—', maxNom);
      const cant    = `x${p.cantidad ?? 1}`;
      lines.push((num + nombre).padEnd(22) + cant.padStart(6));
      if (p.observacion) {
        lines.push('  > ' + trunc(p.observacion, W - 4));
      }
    });

    lines.push(DIVB);

    // Totales
    const totalUnd = activos.reduce((s, p) => s + (p.cantidad ?? 1), 0);
    lines.push(center(`${activos.length} producto(s) / ${totalUnd} und.`));
    lines.push(center('-- USO INTERNO / COCINA --'));

    /* Escapar HTML */
    const safe = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const preContent = lines.map(safe).join('\n');

    const html = `<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8">
  <title>Comanda #${venta?.id ?? ''}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      font-weight: bold;
      color: #000;
      background: #fff;
      width: 80mm;
      padding: 3mm 4mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      font-weight: bold;
      color: #000;
      white-space: pre;
      line-height: 1.5;
      margin: 0;
      width: 100%;
      overflow: hidden;
    }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { width: 100%; padding: 3mm 4mm; }
    }
  </style>
</head><body>
  <pre>${preContent}</pre>
</body></html>`;

    const win = window.open('', '_blank', 'width=420,height=600,scrollbars=yes');
    if (!win) {
      this.toastService.warning('El navegador bloqueó la ventana emergente. Permita ventanas emergentes e intente de nuevo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
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
        // Refrescar el listado principal (siempre está en el DOM)
        this.listarComponent?.cargarPedidos();
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error || 'Error desconocido'));
        this.agregando.delete(id);
      },
    });
  }
}
