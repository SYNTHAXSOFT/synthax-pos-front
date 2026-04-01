import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Usuario } from '../../usuario/interfaces/usuario.interface';
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

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${API_ENDPOINTS.USUARIOS_ROL_ACTIVOS}/CLIENTE`,
      { headers: this.headers }
    );
  }

  crear(cliente: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}`,
      { ...cliente, rol: 'CLIENTE' },
      { headers: this.headers }
    );
  }

  actualizar(id: number, cliente: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${id}`,
      { ...cliente, rol: 'CLIENTE' },
      { headers: this.headers }
    );
  }

  desactivar(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${id}/desactivar`,
      {},
      { headers: this.headers }
    );
  }
}
