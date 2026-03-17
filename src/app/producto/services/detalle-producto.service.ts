import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DetalleProducto } from '../interfaces/detalle-producto.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class DetalleProductoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.DETALLE_PRODUCTO}`;

  crear(detalle: { producto: { id: number }; insumo: { id: number }; cantidad: number }): Observable<DetalleProducto> {
    return this.http.post<DetalleProducto>(this.base, detalle);
  }

  obtenerPorProducto(productoId: number): Observable<DetalleProducto[]> {
    return this.http.get<DetalleProducto[]>(`${this.base}/producto/${productoId}`);
  }

  obtenerActivosPorProducto(productoId: number): Observable<DetalleProducto[]> {
    return this.http.get<DetalleProducto[]>(`${this.base}/producto/${productoId}/activos`);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  /** Elimina toda la receta de un producto (borra todas las líneas) */
  eliminarPorProducto(productoId: number): Observable<any> {
    return this.http.delete(`${this.base}/producto/${productoId}`);
  }
}
