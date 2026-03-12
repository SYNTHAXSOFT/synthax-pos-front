import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Usuario } from '../interfaces/usuario.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {

  private readonly http        = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'Usuario-Id': this.authService.getUserId()?.toString() ?? '' });
  }

  crearUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}`,
      usuario,
      { headers: this.headers }
    );
  }

  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${environment.URL}/${API_ENDPOINTS.USUARIOS}`);
  }

  listarUsuariosFiltrados(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/filtrado`,
      { headers: this.headers }
    );
  }

  listarPorRolActivos(rol: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${API_ENDPOINTS.USUARIOS_ROL_ACTIVOS}/${rol}`
    );
  }

  obtenerPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${environment.URL}/${API_ENDPOINTS.USUARIOS}/${id}`);
  }

  actualizar(id: number, usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${id}`,
      usuario
    );
  }

  activarInactivar(usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${usuario.id}`,
      usuario
    );
  }

  desactivar(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${id}/desactivar`,
      {}
    );
  }
}
