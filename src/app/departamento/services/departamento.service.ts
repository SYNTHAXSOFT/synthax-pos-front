import { environment } from './../../../environments/environment.development';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Departamento } from '../interfaces/departamento.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private readonly http = inject(HttpClient);

  crearDepartamento(departamento: Departamento): Observable<Departamento> {
    return this.http.post<Departamento>(`${environment.URL}/${API_ENDPOINTS.DEPTOS}`, departamento);
  }

  obtenerTodos(): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(`${environment.URL}/${API_ENDPOINTS.DEPTOS}`);
  }

  obtenerPorId(id: string): Observable<Departamento> {
    return this.http.get<Departamento>(`${environment.URL}/${API_ENDPOINTS.DEPTOS}/${id}`);
  }

  actualizar(id: string, departamento: Departamento): Observable<Departamento> {
    return this.http.put<Departamento>(`${environment.URL}/${API_ENDPOINTS.DEPTOS}/${id}`, departamento);
  }

  eliminar(id: string): Observable<any> {
    return this.http.delete(`${environment.URL}/${API_ENDPOINTS.DEPTOS}/${id}`);
  }

  desactivar(id: string): Observable<Departamento> {
    return this.http.patch<Departamento>(`${environment.URL}/${API_ENDPOINTS.DEPTOS}/${id}/desactivar`, {});
  }
}
