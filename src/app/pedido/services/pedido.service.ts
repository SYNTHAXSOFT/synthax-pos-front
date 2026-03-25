import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CambioEstadoRequest, Pedido, PedidoRequest } from '../interfaces/pedido.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.PEDIDOS}`;

  crear(pedido: PedidoRequest): Observable<Pedido> {
    return this.http.post<Pedido>(this.base, pedido);
  }

  obtenerTodos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.base);
  }

  obtenerPorVenta(ventaId: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.base}/venta/${ventaId}`);
  }

  obtenerActivosPorVenta(ventaId: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.base}/venta/${ventaId}/activos`);
  }

  obtenerPorId(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.base}/${id}`);
  }

  actualizar(id: number, pedido: PedidoRequest): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.base}/${id}`, pedido);
  }

  /** Cambia el estado de un ítem (PATCH /{id}/estado) */
  cambiarEstado(id: number, request: CambioEstadoRequest): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}/estado`, request);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
