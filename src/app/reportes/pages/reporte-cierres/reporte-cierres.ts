import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CajaService } from '../../../caja/services/caja.service';
import { CajaSesion, CajaSesionLogEntry, CierreReporteDTO } from '../../../caja/interfaces/caja.interface';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-reporte-cierres',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-cierres.html',
  styleUrls: ['../../../shared/styles/spx-forms.css', './reporte-cierres.css'],
})
export class ReporteCierresComponent implements OnInit {
  private cajaService  = inject(CajaService);
  private authService  = inject(AuthService);
  private toastService = inject(ToastService);

  cargando = true;
  sesiones: CajaSesion[] = [];

  filtroFechaInicio = '';
  filtroFechaFin    = '';
  filtroEstado      = '';

  sesionExpandida: number | null = null;
  reporteCargando = false;
  reporteDetalle: CierreReporteDTO | null = null;
  reporteError    = '';

  // ── Reapertura ──────────────────────────────────────────────────────────────
  mostrarModalMotivo  = false;
  motivoReapertura    = '';
  reabriendo          = false;
  sesionParaReabrir: CajaSesion | null = null;

  // ── Log de eventos ─────────────────────────────────────────────────────────
  logPorSesion: Map<number, CajaSesionLogEntry[]> = new Map();
  logCargando:  Set<number>                        = new Set();
  logExpandido: Set<number>                        = new Set();

  ngOnInit(): void {
    this.cargarSesiones();
  }

  cargarSesiones(): void {
    this.cargando = true;
    this.cajaService.listarSesiones().subscribe({
      next: (data) => { this.sesiones = data; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

  get sesionesFiltradas(): CajaSesion[] {
    let r = [...this.sesiones];

    if (this.filtroEstado)
      r = r.filter(s => s.estado === this.filtroEstado);

    if (this.filtroFechaInicio) {
      const d = new Date(this.filtroFechaInicio);
      r = r.filter(s => s.fechaApertura && new Date(s.fechaApertura) >= d);
    }
    if (this.filtroFechaFin) {
      const d = new Date(this.filtroFechaFin);
      d.setHours(23, 59, 59, 999);
      r = r.filter(s => s.fechaApertura && new Date(s.fechaApertura) <= d);
    }

    return r;
  }

  get contCerradas(): number { return this.sesionesFiltradas.filter(s => s.estado === 'CERRADA').length; }
  get contAbiertas(): number { return this.sesionesFiltradas.filter(s => s.estado === 'ABIERTA').length; }

  toggleDetalle(sesion: CajaSesion): void {
    if (this.sesionExpandida === sesion.id) {
      this.sesionExpandida = null;
      this.reporteDetalle = null;
      return;
    }
    this.sesionExpandida = sesion.id;
    this.reporteDetalle  = null;
    this.reporteError    = '';
    this.reporteCargando = true;

    this.cajaService.obtenerReportePorSesion(sesion.id).subscribe({
      next: (r) => { this.reporteDetalle = r; this.reporteCargando = false; },
      error: () => {
        this.reporteError    = 'No se pudo cargar el reporte.';
        this.reporteCargando = false;
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin    = '';
    this.filtroEstado      = '';
  }

  // ── Reapertura ──────────────────────────────────────────────────────────────

  /**
   * La sesión reabrirle es la más reciente (sesiones[0], orden DESC)
   * siempre y cuando esté CERRADA — si la más reciente está ABIERTA,
   * ya hay una sesión en curso y no se puede reabrir la anterior.
   */
  get idSesionReabrible(): number | null {
    if (!this.sesiones.length) return null;
    const ultima = this.sesiones[0];
    return ultima.estado === 'CERRADA' ? ultima.id : null;
  }

  abrirModalReapertura(sesion: CajaSesion, event: Event): void {
    event.stopPropagation();
    this.sesionParaReabrir = sesion;
    this.motivoReapertura  = '';
    this.mostrarModalMotivo = true;
  }

  cerrarModalReapertura(): void {
    this.mostrarModalMotivo = false;
    this.sesionParaReabrir  = null;
    this.motivoReapertura   = '';
  }

  confirmarReapertura(): void {
    if (!this.motivoReapertura.trim()) return;
    this.reabriendo = true;

    this.cajaService.reabrir(this.motivoReapertura.trim()).subscribe({
      next: () => {
        this.toastService.success('Caja reabierta exitosamente');
        this.reabriendo = false;
        this.cerrarModalReapertura();
        // Refrescar lista para reflejar el nuevo estado
        this.sesionExpandida = null;
        this.reporteDetalle  = null;
        this.logPorSesion.clear();
        this.logExpandido.clear();
        this.cargarSesiones();
      },
      error: (err) => {
        this.toastService.error(err?.error?.mensaje || 'Error al reabrir la caja');
        this.reabriendo = false;
      },
    });
  }

  // ── Log de eventos ─────────────────────────────────────────────────────────

  toggleLog(sesionId: number, event: Event): void {
    event.stopPropagation();

    if (this.logExpandido.has(sesionId)) {
      this.logExpandido.delete(sesionId);
      return;
    }

    this.logExpandido.add(sesionId);

    if (!this.logPorSesion.has(sesionId)) {
      this.logCargando.add(sesionId);
      this.cajaService.obtenerLog(sesionId).subscribe({
        next: (entries) => {
          this.logPorSesion.set(sesionId, entries);
          this.logCargando.delete(sesionId);
        },
        error: () => {
          this.logPorSesion.set(sesionId, []);
          this.logCargando.delete(sesionId);
        },
      });
    }
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  }

  fmtFecha(s?: string): string {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  duracion(apertura?: string, cierre?: string): string {
    if (!apertura || !cierre) return '—';
    const ms = +new Date(cierre) - +new Date(apertura);
    const h  = Math.floor(ms / 3_600_000);
    const m  = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }

  exportarPDF(sesion: CajaSesion, reporte: CierreReporteDTO): void {
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0);

    const fmtF = (s?: string) =>
      s ? new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

    const dur = this.duracion(sesion.fechaApertura, sesion.fechaCierre);

    const rest      = this.authService.getCurrentRestaurante();
    const restNombre = rest?.nombre ?? sesion.restaurante?.nombre ?? 'SYNTHAX POS';
    const restNit    = rest?.nit    ? `NIT: ${rest.nit}` : '';

    /* ── helpers HTML ── */
    const td  = (v: string, cls = '') => `<td class="${cls}">${v}</td>`;
    const tdr = (v: string, cls = '') => `<td class="r ${cls}">${v}</td>`;

    /* ── Sección de ventas ── */
    const ventasBody = reporte.listaVentas?.length
      ? reporte.listaVentas.map(v => `<tr>
          ${td(v.codigo || '—', 'mono')}
          ${td(`<span class="badge">${v.tipoVenta || '—'}</span>`)}
          ${td(v.cliente || '—')}
          ${td(v.metodoPago || '—')}
          ${td((v.productos?.join(', ')) || '—', 'prod')}
          ${tdr('$ ' + fmt(v.valor), 'money')}
        </tr>`).join('')
      : `<tr><td colspan="6" class="empty">Sin ventas registradas en esta sesión.</td></tr>`;

    /* ── Sección de compras ── */
    const comprasBody = reporte.listaCompras?.length
      ? reporte.listaCompras.map((c: any) => `<tr>
          ${td(c.codigo || '—', 'mono')}
          ${td(c.insumo?.descripcion || '—')}
          ${tdr(c.cantidad ?? '—')}
          ${tdr('$ ' + fmt(c.valorUnidad))}
          ${tdr('$ ' + fmt(c.valorTotal), 'money')}
        </tr>`).join('')
      : `<tr><td colspan="5" class="empty">Sin compras registradas en esta sesión.</td></tr>`;

    /* ── Sección de métodos de pago ── */
    const metodosPagoBody = reporte.metodosPago?.length
      ? reporte.metodosPago.map(mp => `<tr>
          ${td(mp.formaPagoNombre)}
          ${tdr('$ ' + fmt(mp.saldoInicial))}
          ${tdr('$ ' + fmt(mp.ingresosDelDia), 'money')}
          ${tdr('$ ' + fmt(mp.egresosDelDia), 'red')}
          ${tdr('$ ' + fmt(mp.saldoFinal))}
        </tr>`).join('')
      : `<tr><td colspan="5" class="empty">Sin movimientos de formas de pago.</td></tr>`;

    /* ── Sección de insumos ── */
    const insumosBody = reporte.listaInsumos?.length
      ? reporte.listaInsumos.map(ins => `<tr>
          ${td(ins.insumoDescripcion)}
          ${td(ins.medida)}
          ${tdr(String(ins.stockInicial))}
          ${tdr('+' + ins.stockComprado, 'money')}
          ${tdr('-' + ins.stockVendido, 'red')}
          ${tdr(String(ins.stockFinal))}
        </tr>`).join('')
      : `<tr><td colspan="6" class="empty">Sin movimientos de insumos.</td></tr>`;

    const cuadreIcon  = reporte.coincideConVentas ? '✓' : '✗';
    const cuadreTxt   = reporte.coincideConVentas ? 'Cuadra' : 'No cuadra';
    const cuadreCls   = reporte.coincideConVentas ? 'card-green' : 'card-red';

    const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Cierre de Caja #${sesion.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    font-size: 11px;
    color: #1a1a2e;
    background: #fff;
    padding: 24px 28px;
  }
  @media print {
    body { padding: 12px; }
    @page { size: A4 landscape; margin: 12mm; }
    .no-print { display: none !important; }
  }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 2px solid #0d7ff2; padding-bottom: 12px; }
  .header-left h1 { font-size: 18px; font-weight: 800; color: #0d7ff2; margin-bottom: 2px; }
  .header-left p  { font-size: 10px; color: #64748b; }
  .header-right { text-align: right; }
  .header-right .session-id { font-size: 22px; font-weight: 800; color: #0d7ff2; }
  .header-right p { font-size: 10px; color: #64748b; margin-top: 2px; }

  /* Info sesión */
  .session-info { display: flex; gap: 24px; flex-wrap: wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
  .session-info span { font-size: 10px; color: #64748b; }
  .session-info strong { display: block; font-size: 11px; color: #1a1a2e; margin-top: 2px; }

  /* Tarjetas totales */
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .card-green { border-color: #86efac; background: #f0fdf4; }
  .card-amber { border-color: #fcd34d; background: #fffbeb; }
  .card-red   { border-color: #fca5a5; background: #fef2f2; }
  .card-blue  { border-color: #93c5fd; background: #eff6ff; }
  .card-lbl { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  .card-val { font-size: 15px; font-weight: 800; color: #1a1a2e; }

  /* Secciones */
  .section { margin-bottom: 18px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .section-title .ico { font-size: 12px; }

  /* Tablas */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 5px 8px; font-weight: 700; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .03em; color: #475569; }
  td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: middle; }
  tr:nth-child(even) td { background: #fafafa; }
  .r  { text-align: right; }
  .mono { font-family: monospace; font-size: 10px; color: #0d7ff2; }
  .money { font-weight: 700; color: #16a34a; }
  .red   { color: #dc2626; }
  .prod  { color: #475569; font-size: 9px; }
  .badge { background: #e2e8f0; border-radius: 3px; padding: 1px 5px; font-size: 9px; font-weight: 700; color: #334155; }
  .empty { text-align: center; color: #94a3b8; font-style: italic; padding: 10px; }

  /* Botón imprimir (solo pantalla) */
  .btn-print { display: inline-block; margin-bottom: 18px; background: #0d7ff2; color: #fff; border: none; border-radius: 5px; padding: 8px 18px; font-size: 12px; font-weight: 600; cursor: pointer; }
  .btn-print:hover { background: #0b6fd9; }

  /* Footer */
  .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; }
</style>
</head><body>

<button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

<!-- Header -->
<div class="header">
  <div class="header-left">
    <h1>${restNombre}</h1>
    <p>${restNit}</p>
    <p style="margin-top:4px;font-size:11px;font-weight:600;">Reporte de Cierre de Caja</p>
  </div>
  <div class="header-right">
    <div class="session-id">Sesión #${sesion.id}</div>
    <p>Estado: <strong style="color:${sesion.estado === 'CERRADA' ? '#16a34a' : '#d97706'}">${sesion.estado}</strong></p>
    <p style="margin-top:4px;">Generado: ${new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>
  </div>
</div>

<!-- Info sesión -->
<div class="session-info">
  <div><span>Apertura</span><strong>${fmtF(sesion.fechaApertura)}</strong></div>
  <div><span>Cierre</span><strong>${fmtF(sesion.fechaCierre)}</strong></div>
  <div><span>Duración</span><strong>${dur}</strong></div>
  <div><span>Monto Inicial</span><strong>$ ${fmt(sesion.montoInicial)}</strong></div>
  ${sesion.usuarioApertura ? `<div><span>Abrió</span><strong>${sesion.usuarioApertura.nombre ?? ''} ${sesion.usuarioApertura.apellido ?? ''}</strong></div>` : ''}
  ${sesion.usuarioCierre   ? `<div><span>Cerró</span><strong>${sesion.usuarioCierre.nombre ?? ''} ${sesion.usuarioCierre.apellido ?? ''}</strong></div>`   : ''}
</div>

<!-- Tarjetas totales -->
<div class="cards">
  <div class="card card-green">
    <div class="card-lbl">Total Ventas</div>
    <div class="card-val">$ ${fmt(reporte.totalVentasDia)}</div>
  </div>
  <div class="card card-amber">
    <div class="card-lbl">Total Compras</div>
    <div class="card-val">$ ${fmt(reporte.totalComprasDia)}</div>
  </div>
  <div class="card card-blue">
    <div class="card-lbl">Efectivo a Entregar</div>
    <div class="card-val">$ ${fmt(reporte.efectivoAEntregar)}</div>
  </div>
  <div class="card ${cuadreCls}">
    <div class="card-lbl">Cuadre</div>
    <div class="card-val">${cuadreIcon} ${cuadreTxt}</div>
  </div>
</div>

<!-- Ventas -->
<div class="section">
  <div class="section-title"><span class="ico">🧾</span> Ventas de la Sesión (${reporte.listaVentas?.length ?? 0})</div>
  <table>
    <thead><tr>
      <th style="width:90px">Código</th>
      <th style="width:90px">Tipo</th>
      <th style="width:120px">Cliente</th>
      <th style="width:120px">Método Pago</th>
      <th>Productos</th>
      <th class="r" style="width:100px">Valor</th>
    </tr></thead>
    <tbody>${ventasBody}</tbody>
  </table>
</div>

<!-- Compras -->
<div class="section">
  <div class="section-title"><span class="ico">🛒</span> Compras de la Sesión (${reporte.listaCompras?.length ?? 0})</div>
  <table>
    <thead><tr>
      <th style="width:100px">Código</th>
      <th>Insumo</th>
      <th class="r" style="width:80px">Cantidad</th>
      <th class="r" style="width:110px">Valor Unitario</th>
      <th class="r" style="width:110px">Total</th>
    </tr></thead>
    <tbody>${comprasBody}</tbody>
  </table>
</div>

<!-- Métodos de pago -->
<div class="section">
  <div class="section-title"><span class="ico">💳</span> Métodos de Pago</div>
  <table>
    <thead><tr>
      <th>Método</th>
      <th class="r" style="width:110px">Saldo Inicial</th>
      <th class="r" style="width:110px">Ingresos</th>
      <th class="r" style="width:110px">Egresos</th>
      <th class="r" style="width:110px">Saldo Final</th>
    </tr></thead>
    <tbody>${metodosPagoBody}</tbody>
  </table>
</div>

<!-- Movimiento de Insumos -->
<div class="section">
  <div class="section-title"><span class="ico">📦</span> Movimiento de Insumos</div>
  <table>
    <thead><tr>
      <th>Insumo</th>
      <th style="width:80px">Medida</th>
      <th class="r" style="width:100px">Stock Inicial</th>
      <th class="r" style="width:90px">Comprado</th>
      <th class="r" style="width:90px">Vendido</th>
      <th class="r" style="width:100px">Stock Final</th>
    </tr></thead>
    <tbody>${insumosBody}</tbody>
  </table>
</div>

<div class="footer">
  <span>${restNombre} — Reporte de Cierre #${sesion.id}</span>
  <span>Generado por SYNTHAX POS</span>
</div>

</body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=750,scrollbars=yes');
    if (!win) {
      alert('El navegador bloqueó la ventana emergente. Permita ventanas emergentes para este sitio e intente de nuevo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }
}
