import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Cliente } from '../interfaces/cliente.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class ClienteService {

  private readonly http        = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'Usuario-Id': this.authService.getUserId()?.toString() ?? '' });
  }

  private get url(): string {
    return `${environment.URL}/${API_ENDPOINTS.CLIENTES}`;
  }

  listar(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.url, { headers: this.headers });
  }

  obtenerPorId(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.url}/${id}`, { headers: this.headers });
  }

  crear(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.url, cliente, { headers: this.headers });
  }

  actualizar(id: number, cliente: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.url}/${id}`, cliente, { headers: this.headers });
  }

  desactivar(id: number): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.url}/${id}/desactivar`, {}, { headers: this.headers });
  }

  activar(id: number): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.url}/${id}/activar`, {}, { headers: this.headers });
  }
}
