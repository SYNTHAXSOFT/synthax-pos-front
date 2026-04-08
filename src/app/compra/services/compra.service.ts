import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Compra, CompraRequest } from '../interfaces/compra.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.COMPRAS}`;

  crear(compra: CompraRequest): Observable<Compra> {
    return this.http.post<Compra>(this.base, compra);
  }

  obtenerTodas(): Observable<Compra[]> {
    return this.http.get<Compra[]>(this.base);
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
}
