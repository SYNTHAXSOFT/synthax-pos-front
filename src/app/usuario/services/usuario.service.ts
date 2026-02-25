import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Usuario } from '../interfaces/usuario.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  // 👇 MODIFICADO: Envía el ID del usuario logueado en el header
  crearUsuario(usuario: Usuario): Observable<Usuario> {
    const usuarioId = this.authService.getUserId();
    const headers = new HttpHeaders({
      'Usuario-Id': usuarioId?.toString() || ''
    });
    
    return this.http.post<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}`, 
      usuario,
      { headers }
    );
  }

  activarInactivarUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${usuario.id}`, 
      usuario
    );
  }

  // 👇 NUEVO MÉTODO: Listar usuarios filtrados
  listarUsuariosFiltrados(): Observable<Usuario[]> {
    const usuarioId = this.authService.getUserId();
    const headers = new HttpHeaders({
      'Usuario-Id': usuarioId?.toString() || ''
    });
    
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/filtrado`,
      { headers }
    );
  }

  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}`,
      {}
    );
  }

  listarUsuariosPorRolActivos(rol: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${API_ENDPOINTS.USUARIOS_ROL_ACTIVOS}/${rol}`,
      {}
    );
  }

  actualizar(id: number, usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/${id}`, 
      usuario
    );
  }

  obtenerPorId(id: number): Observable<Usuario> {
      return this.http.get<Usuario>(`${environment.URL}/${API_ENDPOINTS.USUARIOS}/${id}`);
  }

  listarCandidatos(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.URL}/${API_ENDPOINTS.CANDIDATO}`,{});
  }

  listarTestigosDisponibles(): Observable<Usuario[]> {
  const usuarioId = this.authService.getUserId();
  const headers = new HttpHeaders({
    'Usuario-Id': usuarioId?.toString() || ''
  });
  
  return this.http.get<Usuario[]>(
    `${environment.URL}/${API_ENDPOINTS.USUARIOS}/testigos-disponibles`,
    { headers }
  );
}

  listarTestigosDisponiblesPorMunicipio(municipioId: string): Observable<Usuario[]> {
    const usuarioId = this.authService.getUserId();
    const headers = new HttpHeaders({
      'Usuario-Id': usuarioId?.toString() || ''
    });
    
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/testigos-disponibles/municipio/${municipioId}`,
      { headers }
    );
  }

  listarTestigosDisponiblesPorDepartamento(departamentoId: string): Observable<Usuario[]> {
    const usuarioId = this.authService.getUserId();
    const headers = new HttpHeaders({
      'Usuario-Id': usuarioId?.toString() || ''
    });
    
    return this.http.get<Usuario[]>(
      `${environment.URL}/${API_ENDPOINTS.USUARIOS}/testigos-disponibles/departamento/${departamentoId}`,
      { headers }
    );
  }

}

