import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FormaPago, MovimientoFormaPago } from '../interfaces/forma-pago.interface';
import { AuthService } from '../../auth/services/auth.service';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class FormaPagoService {
  private readonly http        = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly base        = `${environment.URL}/${API_ENDPOINTS.FORMAS_PAGO}`;

  private headers(): HttpHeaders {
    const userId = this.authService.getUserId();
    return userId
      ? new HttpHeaders({ 'Usuario-Id': String(userId) })
      : new HttpHeaders();
  }

  obtenerTodas(): Observable<FormaPago[]> {
    return this.http.get<FormaPago[]>(this.base, { headers: this.headers() });
  }

  obtenerActivas(): Observable<FormaPago[]> {
    return this.http.get<FormaPago[]>(`${this.base}/activas`, { headers: this.headers() });
  }

  obtenerPorId(id: number): Observable<FormaPago> {
    return this.http.get<FormaPago>(`${this.base}/${id}`, { headers: this.headers() });
  }

  crear(data: FormaPago): Observable<FormaPago> {
    return this.http.post<FormaPago>(this.base, data, { headers: this.headers() });
  }

  actualizar(id: number, data: FormaPago): Observable<FormaPago> {
    return this.http.put<FormaPago>(`${this.base}/${id}`, data, { headers: this.headers() });
  }

  ajustarSaldo(id: number, nuevoSaldo: number, explicacion: string): Observable<FormaPago> {
    const params = new HttpParams()
      .set('nuevoSaldo', nuevoSaldo)
      .set('explicacion', explicacion);
    return this.http.patch<FormaPago>(`${this.base}/${id}/ajustar-saldo`, null,
      { headers: this.headers(), params });
  }

  desactivar(id: number): Observable<FormaPago> {
    return this.http.patch<FormaPago>(`${this.base}/${id}/desactivar`, null,
      { headers: this.headers() });
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`, { headers: this.headers() });
  }

  obtenerMovimientos(id: number): Observable<MovimientoFormaPago[]> {
    return this.http.get<MovimientoFormaPago[]>(`${this.base}/${id}/movimientos`,
      { headers: this.headers() });
  }
}
