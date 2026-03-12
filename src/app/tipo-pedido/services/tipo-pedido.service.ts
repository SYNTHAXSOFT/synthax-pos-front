import { environment } from '../../../environments/environment.development';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoPedido } from '../interfaces/tipo-pedido.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class TipoPedidoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.TIPOS_PEDIDO}`;

  crear(tipoPedido: TipoPedido): Observable<TipoPedido> {
    return this.http.post<TipoPedido>(this.base, tipoPedido);
  }

  obtenerTodos(): Observable<TipoPedido[]> {
    return this.http.get<TipoPedido[]>(this.base);
  }

  obtenerActivos(): Observable<TipoPedido[]> {
    return this.http.get<TipoPedido[]>(`${this.base}/activos`);
  }

  obtenerPorId(id: number): Observable<TipoPedido> {
    return this.http.get<TipoPedido>(`${this.base}/${id}`);
  }

  actualizar(id: number, tipoPedido: TipoPedido): Observable<TipoPedido> {
    return this.http.put<TipoPedido>(`${this.base}/${id}`, tipoPedido);
  }

  desactivar(id: number): Observable<TipoPedido> {
    return this.http.patch<TipoPedido>(`${this.base}/${id}/desactivar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
