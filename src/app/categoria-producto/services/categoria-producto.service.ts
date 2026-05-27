import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { CategoriaProducto } from '../interfaces/categoria-producto.interface';

@Injectable({ providedIn: 'root' })
export class CategoriaProductoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.CATEGORIA_PRODUCTO}`;

  listar(): Observable<CategoriaProducto[]> {
    return this.http.get<CategoriaProducto[]>(this.base);
  }

  listarActivas(): Observable<CategoriaProducto[]> {
    return this.http.get<CategoriaProducto[]>(`${this.base}/activas`);
  }

  listarPorRestaurante(restauranteId: number): Observable<CategoriaProducto[]> {
    return this.http.get<CategoriaProducto[]>(`${this.base}/restaurante/${restauranteId}`);
  }

  obtenerPorId(id: number): Observable<CategoriaProducto> {
    return this.http.get<CategoriaProducto>(`${this.base}/${id}`);
  }

  crear(categoria: CategoriaProducto): Observable<CategoriaProducto> {
    return this.http.post<CategoriaProducto>(this.base, categoria);
  }

  actualizar(id: number, categoria: CategoriaProducto): Observable<CategoriaProducto> {
    return this.http.put<CategoriaProducto>(`${this.base}/${id}`, categoria);
  }

  desactivar(id: number): Observable<CategoriaProducto> {
    return this.http.patch<CategoriaProducto>(`${this.base}/${id}/desactivar`, {});
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
