import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Impuesto } from '../interfaces/impuesto.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class ImpuestoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.IMPUESTOS}`;

  crear(impuesto: Impuesto): Observable<Impuesto> {
    return this.http.post<Impuesto>(this.base, impuesto);
  }

  obtenerTodos(): Observable<Impuesto[]> {
    return this.http.get<Impuesto[]>(this.base);
  }

  obtenerActivos(): Observable<Impuesto[]> {
    return this.http.get<Impuesto[]>(`${this.base}/activos`);
  }

  obtenerPorId(id: number): Observable<Impuesto> {
    return this.http.get<Impuesto>(`${this.base}/${id}`);
  }

  actualizar(id: number, impuesto: Impuesto): Observable<Impuesto> {
    return this.http.put<Impuesto>(`${this.base}/${id}`, impuesto);
  }

  desactivar(id: number): Observable<Impuesto> {
    return this.http.patch<Impuesto>(`${this.base}/${id}/desactivar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
