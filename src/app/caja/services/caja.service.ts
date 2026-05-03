import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { AuthService } from '../../auth/services/auth.service';
import {
  AperturaCajaRequest,
  CajaEstadoResponse,
  CajaSesion,
  CajaSesionLogEntry,
  CierreReporteDTO,
  ReaperturaCajaRequest
} from '../interfaces/caja.interface';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http        = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly base        = `${environment.URL}/${API_ENDPOINTS.CAJA}`;

  /** Estado en memoria para evitar múltiples llamadas HTTP en guards y componentes. */
  readonly cajaAbierta = signal<boolean | null>(null);

  private headers(): HttpHeaders {
    const userId = this.authService.getUserId();
    return userId
      ? new HttpHeaders({ 'Usuario-Id': String(userId) })
      : new HttpHeaders();
  }

  obtenerEstado(): Observable<CajaEstadoResponse> {
    return this.http.get<CajaEstadoResponse>(`${this.base}/estado`, { headers: this.headers() })
      .pipe(tap(r => this.cajaAbierta.set(r.abierta)));
  }

  /** Invalida el estado cacheado (llamar tras login/logout). */
  invalidarEstado(): void {
    this.cajaAbierta.set(null);
  }

  obtenerEstadoPorRestaurante(restauranteId: number): Observable<{ abierta: boolean }> {
    return this.http.get<{ abierta: boolean }>(`${this.base}/estado/${restauranteId}`);
  }

  aperturar(request: AperturaCajaRequest): Observable<CajaSesion> {
    return this.http.post<CajaSesion>(`${this.base}/apertura`, request, { headers: this.headers() })
      .pipe(tap(() => this.cajaAbierta.set(true)));
  }

  cerrar(): Observable<CierreReporteDTO> {
    return this.http.post<CierreReporteDTO>(`${this.base}/cierre`, null, { headers: this.headers() })
      .pipe(tap(() => this.cajaAbierta.set(false)));
  }

  obtenerReportePrevio(): Observable<CierreReporteDTO> {
    return this.http.get<CierreReporteDTO>(`${this.base}/reporte-previo`, { headers: this.headers() });
  }

  obtenerReportePorSesion(sesionId: number): Observable<CierreReporteDTO> {
    return this.http.get<CierreReporteDTO>(`${this.base}/reporte/${sesionId}`, { headers: this.headers() });
  }

  listarSesiones(): Observable<CajaSesion[]> {
    return this.http.get<CajaSesion[]>(`${this.base}/sesiones`, { headers: this.headers() });
  }

  reabrir(motivo: string): Observable<CajaSesion> {
    const body: ReaperturaCajaRequest = { motivo };
    return this.http.post<CajaSesion>(`${this.base}/reabrir`, body, { headers: this.headers() })
      .pipe(tap(() => this.cajaAbierta.set(true)));
  }

  obtenerLog(sesionId: number): Observable<CajaSesionLogEntry[]> {
    return this.http.get<CajaSesionLogEntry[]>(
      `${this.base}/sesiones/${sesionId}/log`, { headers: this.headers() }
    );
  }
}
