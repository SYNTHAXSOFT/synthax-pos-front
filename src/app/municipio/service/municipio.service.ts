import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Municipio } from '../interfaces/municipio.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class MunicipioService {
  private readonly http = inject(HttpClient);

  crearMunicipio(municipio: Municipio): Observable<Municipio> {
    return this.http.post<Municipio>(`${environment.URL}/${API_ENDPOINTS.MPIOS}`, municipio);
  }

  /** Solo activos — usado en listados y selectores de la app. */
  obtenerTodos(): Observable<Municipio[]> {
    return this.http.get<Municipio[]>(`${environment.URL}/${API_ENDPOINTS.MPIOS}`);
  }

  /** Todos (activos e inactivos) — solo para el panel de administración ROOT. */
  obtenerTodosAdmin(): Observable<Municipio[]> {
    return this.http.get<Municipio[]>(`${environment.URL}/${API_ENDPOINTS.MPIOS}/todos`);
  }

  obtenerPorId(id: string): Observable<Municipio> {
    return this.http.get<Municipio>(`${environment.URL}/${API_ENDPOINTS.MPIOS}/${id}`);
  }

  obtenerPorDepartamento(departamentoId: string): Observable<Municipio[]> {
    return this.http.get<Municipio[]>(`${environment.URL}/${API_ENDPOINTS.MPIOS}/departamento/${departamentoId}`);
  }

  actualizar(id: string, municipio: Municipio): Observable<Municipio> {
    return this.http.put<Municipio>(`${environment.URL}/${API_ENDPOINTS.MPIOS}/${id}`, municipio);
  }

  eliminar(id: string): Observable<any> {
    return this.http.delete(`${environment.URL}/${API_ENDPOINTS.MPIOS}/${id}`);
  }

  desactivar(id: string): Observable<Municipio> {
    return this.http.patch<Municipio>(`${environment.URL}/${API_ENDPOINTS.MPIOS}/${id}/desactivar`, {});
  }
}
