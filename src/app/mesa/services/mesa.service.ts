import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mesa } from '../interfaces/mesa.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class MesaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.MESAS}`;

  crear(mesa: Mesa): Observable<Mesa> {
    return this.http.post<Mesa>(this.base, mesa);
  }

  obtenerTodos(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(this.base);
  }

  // El endpoint del backend usa /activas (femenino, acorde a "mesa")
  obtenerActivos(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(`${this.base}/activas`);
  }

  obtenerPorId(id: number): Observable<Mesa> {
    return this.http.get<Mesa>(`${this.base}/${id}`);
  }

  actualizar(id: number, mesa: Mesa): Observable<Mesa> {
    return this.http.put<Mesa>(`${this.base}/${id}`, mesa);
  }

  desactivar(id: number): Observable<Mesa> {
    return this.http.patch<Mesa>(`${this.base}/${id}/desactivar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
