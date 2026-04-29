import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CajaService } from '../../services/caja.service';
import { CierreReporteDTO } from '../../interfaces/caja.interface';

@Component({
  selector: 'app-cierre-caja-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cierre-caja-modal.component.html',
  styleUrls: ['./cierre-caja-modal.component.css']
})
export class CierreCajaModalComponent implements OnInit {

  @Output() cerrado  = new EventEmitter<void>();
  @Output() cerradoOk = new EventEmitter<CierreReporteDTO>();

  private cajaService = inject(CajaService);

  reporte:       CierreReporteDTO | null = null;
  cargando       = true;
  cerrando       = false;
  descargando    = false;
  error          = '';
  reporteFinal:  CierreReporteDTO | null = null;  // reporte post-cierre

  ngOnInit(): void {
    this.cajaService.obtenerReportePrevio().subscribe({
      next: (r) => { this.reporte = r; this.cargando = false; },
      error: (e) => {
        this.error    = e?.error?.mensaje ?? 'Error al cargar el reporte.';
        this.cargando = false;
      }
    });
  }

  finalizar(): void {
    this.cerrando = true;
    this.error    = '';

    this.cajaService.cerrar().subscribe({
      next: (r) => {
        this.cerrando     = false;
        this.reporteFinal = r;
        this.reporte      = r;
        this.descargarPdf(r);
        this.cerradoOk.emit(r);
      },
      error: (e) => {
        this.cerrando = false;
        this.error    = e?.error?.mensaje ?? 'Error al cerrar la caja.';
      }
    });
  }

  cancelar(): void {
    this.cerrado.emit();
  }

  descargarPdf(reporte?: CierreReporteDTO): void {
    const r = reporte ?? this.reporte;
    if (!r) return;
    this.descargando = true;
    this.imprimirReporte(r);
    this.descargando = false;
  }

  /** Abre una ventana nueva con el reporte formateado para imprimir/guardar como PDF */
  private imprimirReporte(r: CierreReporteDTO): void {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(this.buildHtmlReporte(r));
    win.document.close();
    win.print();
  }

  private buildHtmlReporte(r: CierreReporteDTO): string {
    const fmt = (n: number) => new Intl.NumberFormat('es-CO').format(n ?? 0);
    const fecha = new Date().toLocaleString('es-CO');
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Cierre de Caja</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
h1{text-align:center;font-size:16px}table{width:100%;border-collapse:collapse;margin-bottom:16px}
th,td{border:1px solid #ccc;padding:4px 8px}th{background:#f0f0f0}
.r{text-align:right}.total{font-weight:bold}</style></head><body>
<h1>CIERRE DE CAJA</h1>
<p style="text-align:center">Fecha: ${fecha}</p>
<h3>Resumen</h3>
<table><tr><td>Monto inicial</td><td class="r">$ ${fmt(r.montoInicial)}</td></tr>
<tr><td>Total ventas de la sesión</td><td class="r">$ ${fmt(r.totalVentasDia)}</td></tr>
<tr><td>Total compras de la sesión</td><td class="r">$ ${fmt(r.totalComprasDia)}</td></tr>
<tr class="total"><td>Efectivo a entregar</td><td class="r">$ ${fmt(r.efectivoAEntregar)}</td></tr></table>
<h3>Ventas de la sesión</h3>
<table><tr><th>#</th><th>Tipo</th><th>Cliente</th><th>Método de Pago</th><th>Productos</th><th class="r">Valor</th></tr>
${(r.listaVentas ?? []).map(v => `<tr><td>${v.codigo ?? v.ventaId}</td><td>${v.tipoVenta}</td>
<td>${v.cliente}</td><td>${v.metodoPago}</td><td>${(v.productos ?? []).join(', ') || '—'}</td>
<td class="r">$ ${fmt(v.valor)}</td></tr>`).join('')}
<tr class="total"><td colspan="5">Total</td><td class="r">$ ${fmt(r.totalVentasDia)}</td></tr></table>
<h3>Compras de la sesión</h3>
<table><tr><th>Insumo</th><th>Cantidad</th><th class="r">Total</th></tr>
${(r.listaCompras ?? []).map(c => `<tr><td>${c.insumo?.descripcion ?? '—'}</td>
<td>${c.cantidad}</td><td class="r">$ ${fmt(c.valorTotal)}</td></tr>`).join('')}
<tr class="total"><td colspan="2">Total</td><td class="r">$ ${fmt(r.totalComprasDia)}</td></tr></table>
<h3>Métodos de Pago</h3>
<table><tr><th>Método</th><th class="r">Saldo Inicial</th><th class="r">Ingresos</th>
<th class="r">Egresos</th><th class="r">Saldo Final</th><th class="r">Diferencia</th></tr>
${(r.metodosPago ?? []).map(mp => `<tr><td>${mp.formaPagoNombre}</td>
<td class="r">$ ${fmt(mp.saldoInicial)}</td><td class="r">$ ${fmt(mp.ingresosDelDia)}</td>
<td class="r">$ ${fmt(mp.egresosDelDia)}</td><td class="r">$ ${fmt(mp.saldoFinal)}</td>
<td class="r">$ ${fmt(mp.diferencia)}</td></tr>`).join('')}
<tr class="total"><td colspan="2">Total ingresos</td><td class="r">$ ${fmt(r.totalIngresosFormaPago)}</td>
<td colspan="2">${r.coincideConVentas ? '✓ Cuadra con ventas' : '✗ No cuadra con ventas'}</td><td></td></tr></table>
<h3>Insumos</h3>
<table><tr><th>Insumo</th><th>Unidad</th><th class="r">Stock Inicial</th>
<th class="r">Comprado</th><th class="r">Vendido</th><th class="r">Stock Final</th></tr>
${(r.listaInsumos ?? []).map(i => `<tr><td>${i.insumoDescripcion}</td><td>${i.medida}</td>
<td class="r">${i.stockInicial}</td>
<td class="r">${i.stockComprado > 0 ? '+' + i.stockComprado : '—'}</td>
<td class="r">${i.stockVendido > 0 ? i.stockVendido : '—'}</td>
<td class="r">${i.stockFinal}</td></tr>`).join('')}
</table></body></html>`;
  }

  getIngresosEfectivo(): number {
    if (!this.reporte?.metodosPago) return 0;
    const mp = this.reporte.metodosPago.find(m =>
      m.formaPagoNombre?.toLowerCase().includes('efectivo') ||
      m.formaPagoNombre?.toLowerCase().includes('cash')
    );
    return mp?.ingresosDelDia ?? 0;
  }

  getEgresosEfectivo(): number {
    if (!this.reporte?.metodosPago) return 0;
    const mp = this.reporte.metodosPago.find(m =>
      m.formaPagoNombre?.toLowerCase().includes('efectivo') ||
      m.formaPagoNombre?.toLowerCase().includes('cash')
    );
    return mp?.egresosDelDia ?? 0;
  }

  fmt(n: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(n ?? 0);
  }

  fmtFecha(s: string | null | undefined): string {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-CO', {
      dateStyle: 'medium', timeStyle: 'short'
    });
  }
}
