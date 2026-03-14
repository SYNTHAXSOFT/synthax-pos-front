import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Venta, VentaRequest } from '../interfaces/venta.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.VENTAS}`;

  crear(venta: VentaRequest): Observable<Venta> {
    return this.http.post<Venta>(this.base, venta);
  }

  obtenerTodos(): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.base);
  }

  obtenerPorEstado(estado: string): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.base}/estado/${estado}`);
  }

  obtenerAbiertas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.base}/estado/ABIERTA`);
  }

  obtenerPorId(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.base}/${id}`);
  }

  actualizar(id: number, venta: VentaRequest): Observable<Venta> {
    return this.http.put<Venta>(`${this.base}/${id}`, venta);
  }

  cerrarVenta(id: number, valorTotal: number, usuarioFacturadorId?: number): Observable<Venta> {
    let params = new HttpParams().set('valorTotal', valorTotal.toString());
    if (usuarioFacturadorId != null) {
      params = params.set('usuarioFacturadorId', usuarioFacturadorId.toString());
    }
    return this.http.patch<Venta>(`${this.base}/${id}/cerrar`, {}, { params });
  }

  anularVenta(id: number): Observable<Venta> {
    return this.http.patch<Venta>(`${this.base}/${id}/anular`, {});
  }

  desactivar(id: number): Observable<Venta> {
    return this.http.patch<Venta>(`${this.base}/${id}/desactivar`, {});
  }
}
