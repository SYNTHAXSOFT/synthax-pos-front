import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CajaService } from '../../../caja/services/caja.service';
import { CajaSesion, CierreReporteDTO } from '../../../caja/interfaces/caja.interface';

@Component({
  selector: 'app-reporte-cierres',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reporte-cierres.html',
  styleUrls: ['./reporte-cierres.css'],
})
export class ReporteCierresComponent implements OnInit {
  private cajaService = inject(CajaService);

  cargando = true;
  sesiones: CajaSesion[] = [];

  filtroFechaInicio = '';
  filtroFechaFin    = '';
  filtroEstado      = '';

  sesionExpandida: number | null = null;
  reporteCargando = false;
  reporteDetalle: CierreReporteDTO | null = null;
  reporteError    = '';

  ngOnInit(): void {
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
}
