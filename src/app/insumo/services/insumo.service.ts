import { environment } from '../../../environments/environment.development';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Insumo, InsumoRequest } from '../interfaces/insumo.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class InsumoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.INSUMOS}`;

  crear(insumo: InsumoRequest): Observable<Insumo> {
    return this.http.post<Insumo>(this.base, insumo);
  }

  obtenerTodos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(this.base);
  }

  obtenerActivos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${this.base}/activos`);
  }

  obtenerPorRestaurante(restauranteId: number): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${this.base}/restaurante/${restauranteId}`);
  }

  obtenerActivosPorRestaurante(restauranteId: number): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${this.base}/restaurante/${restauranteId}/activos`);
  }

  obtenerPorId(id: number): Observable<Insumo> {
    return this.http.get<Insumo>(`${this.base}/${id}`);
  }

  actualizar(id: number, insumo: InsumoRequest): Observable<Insumo> {
    return this.http.put<Insumo>(`${this.base}/${id}`, insumo);
  }

  ajustarStock(id: number, cantidad: number): Observable<Insumo> {
    const params = new HttpParams().set('cantidad', cantidad.toString());
    return this.http.patch<Insumo>(`${this.base}/${id}/ajustar-stock`, {}, { params });
  }

  desactivar(id: number): Observable<Insumo> {
    return this.http.patch<Insumo>(`${this.base}/${id}/desactivar`, {});
  }
}
