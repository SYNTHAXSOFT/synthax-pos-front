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
    const fmt = (n: number) => new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(n ?? 0);
    const fmtCant = (n: number) =>
      Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
    const fecha = new Date().toLocaleString('es-CO');

    const ventasRows = (r.listaVentas ?? []).map(v => {
      const insumosRow = v.insumosConsumidos?.length
        ? `<tr class="ins-row"><td colspan="6">
            <span class="ins-lbl">Insumos:</span>
            ${v.insumosConsumidos.map(i =>
              `<span class="ins-chip">${i.insumoDescripcion} <strong>${fmtCant(i.cantidad)}</strong> ${i.medida}</span>`
            ).join(' ')}
          </td></tr>`
        : '';
      return `<tr>
        <td>${v.codigo ?? v.ventaId}</td>
        <td>${v.tipoVenta}</td>
        <td>${v.cliente}</td>
        <td>${v.metodoPago}</td>
        <td>${(v.productos ?? []).join(', ') || '—'}</td>
        <td class="r">$ ${fmt(v.valor)}</td>
      </tr>${insumosRow}`;
    }).join('');

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Cierre de Caja</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #1a1a2e; }
  h1 { text-align: center; font-size: 16px; margin-bottom: 4px; }
  h3 { font-size: 12px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { border: 1px solid #ddd; padding: 4px 7px; }
  th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
  .r { text-align: right; }
  .total { font-weight: bold; background: #f8fafc; }
  .ins-row td { background: #fffbeb; border-top: 1px dashed #fcd34d; padding: 3px 8px; }
  .ins-lbl { font-size: 8px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-right: 5px; }
  .ins-chip { display: inline-block; background: #fef3c7; border: 1px solid #fde68a; border-radius: 9999px; padding: 1px 6px; font-size: 8.5px; color: #78350f; margin: 1px 2px; }
  .ins-chip strong { font-weight: 700; color: #92400e; }
  @media print { @page { size: A4 landscape; margin: 12mm; } }
</style></head><body>
<h1>CIERRE DE CAJA</h1>
<p style="text-align:center;color:#64748b;margin-top:2px">Fecha: ${fecha}</p>

<h3>Resumen</h3>
<table>
  <tr><td>Monto inicial</td><td class="r">$ ${fmt(r.montoInicial)}</td></tr>
  <tr><td>Total ventas de la sesión</td><td class="r">$ ${fmt(r.totalVentasDia)}</td></tr>
  <tr><td>Total compras de la sesión</td><td class="r">$ ${fmt(r.totalComprasDia)}</td></tr>
  <tr class="total"><td><strong>Efectivo a entregar</strong></td><td class="r"><strong>$ ${fmt(r.efectivoAEntregar)}</strong></td></tr>
</table>

<h3>Ventas de la sesión</h3>
<table>
  <thead><tr><th>#</th><th>Tipo</th><th>Cliente</th><th>Método de Pago</th><th>Productos</th><th class="r">Valor</th></tr></thead>
  <tbody>${ventasRows}</tbody>
  <tfoot><tr class="total"><td colspan="5">Total</td><td class="r">$ ${fmt(r.totalVentasDia)}</td></tr></tfoot>
</table>

<h3>Compras de la sesión</h3>
<table>
  <thead><tr><th>Insumo</th><th>Cantidad</th><th class="r">Total</th></tr></thead>
  <tbody>
    ${(r.listaCompras ?? []).map(c => `<tr>
      <td>${c.insumo?.descripcion ?? '—'}</td>
      <td>${c.cantidad}</td>
      <td class="r">$ ${fmt(c.valorTotal)}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">Sin compras</td></tr>'}
  </tbody>
  <tfoot><tr class="total"><td colspan="2">Total</td><td class="r">$ ${fmt(r.totalComprasDia)}</td></tr></tfoot>
</table>

<h3>Métodos de Pago</h3>
<table>
  <thead><tr><th>Método</th><th class="r">Saldo Inicial</th><th class="r">Ingresos</th><th class="r">Egresos</th><th class="r">Saldo Final</th><th class="r">Diferencia</th></tr></thead>
  <tbody>
    ${(r.metodosPago ?? []).map(mp => `<tr>
      <td>${mp.formaPagoNombre}</td>
      <td class="r">$ ${fmt(mp.saldoInicial)}</td>
      <td class="r">$ ${fmt(mp.ingresosDelDia)}</td>
      <td class="r">$ ${fmt(mp.egresosDelDia)}</td>
      <td class="r">$ ${fmt(mp.saldoFinal)}</td>
      <td class="r">$ ${fmt(mp.diferencia)}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot><tr class="total">
    <td colspan="2">Total ingresos</td>
    <td class="r">$ ${fmt(r.totalIngresosFormaPago)}</td>
    <td colspan="3">${r.coincideConVentas ? '✓ Cuadra con ventas' : '✗ No cuadra con ventas'}</td>
  </tr></tfoot>
</table>

<h3>Movimiento de Insumos</h3>
<table>
  <thead><tr><th>Insumo</th><th>Unidad</th><th class="r">Stock Inicial</th><th class="r">Comprado</th><th class="r">Vendido</th><th class="r">Stock Final</th></tr></thead>
  <tbody>
    ${(r.listaInsumos ?? []).map(i => `<tr>
      <td>${i.insumoDescripcion}</td><td>${i.medida}</td>
      <td class="r">${i.stockInicial}</td>
      <td class="r">${i.stockComprado > 0 ? '+' + i.stockComprado : '—'}</td>
      <td class="r">${i.stockVendido > 0 ? i.stockVendido : '—'}</td>
      <td class="r">${i.stockFinal}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#94a3b8">Sin insumos registrados</td></tr>'}
  </tbody>
</table>
</body></html>`;
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
