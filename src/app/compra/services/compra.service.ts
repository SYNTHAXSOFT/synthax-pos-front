import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Compra, CompraOrdenRequest, CompraRequest } from '../interfaces/compra.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.COMPRAS}`;

  crear(compra: CompraRequest): Observable<Compra> {
    return this.http.post<Compra>(this.base, compra);
  }

  /** Registra una orden con múltiples insumos en una sola transacción. */
  crearOrden(orden: CompraOrdenRequest): Observable<Compra[]> {
    return this.http.post<Compra[]>(`${this.base}/orden`, orden);
  }

  obtenerTodas(): Observable<Compra[]> {
    return this.http.get<Compra[]>(this.base);
  }

  /** Solo trae compras desde `fechaDesde` usando el header Restaurante-Id. */
  obtenerDesde(restauranteId: number, fechaDesde: string): Observable<Compra[]> {
    const params = new HttpParams().set('fechaDesde', fechaDesde);
    return this.http.get<Compra[]>(this.base, {
      headers: { 'Restaurante-Id': restauranteId.toString() },
      params,
    });
  }

  obtenerPorRestaurante(restauranteId: number): Observable<Compra[]> {
    return this.http.get<Compra[]>(`${this.base}/restaurante/${restauranteId}`);
  }

  obtenerActivasPorRestaurante(restauranteId: number): Observable<Compra[]> {
    return this.http.get<Compra[]>(`${this.base}/restaurante/${restauranteId}/activas`);
  }

  obtenerPorInsumo(insumoId: number): Observable<Compra[]> {
    return this.http.get<Compra[]>(`${this.base}/insumo/${insumoId}`);
  }

  obtenerPorId(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.base}/${id}`);
  }

  desactivar(id: number): Observable<Compra> {
    return this.http.patch<Compra>(`${this.base}/${id}/desactivar`, {});
  }

  anular(id: number): Observable<Compra> {
    return this.http.patch<Compra>(`${this.base}/${id}/anular`, {});
  }

  /**
   * Obtiene únicamente la imagen de soporte de una compra (carga lazy).
   * No se llama en el listado — solo al hacer clic en "Ver factura".
   */
  obtenerFactura(id: number): Observable<{ imagenSoporte: string; codigo: string }> {
    return this.http.get<{ imagenSoporte: string; codigo: string }>(`${this.base}/${id}/factura`);
  }
}
