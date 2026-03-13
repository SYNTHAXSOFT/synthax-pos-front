import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Restaurante, RestauranteRequest, BrandingRequest } from '../interfaces/restaurante.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class RestauranteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.RESTAURANTES}`;

  // ── CRUD ─────────────────────────────────────────────────────────────────

  crear(restaurante: RestauranteRequest): Observable<Restaurante> {
    return this.http.post<Restaurante>(this.base, restaurante);
  }

  obtenerTodos(): Observable<Restaurante[]> {
    return this.http.get<Restaurante[]>(this.base);
  }

  obtenerActivos(): Observable<Restaurante[]> {
    return this.http.get<Restaurante[]>(`${this.base}/activos`);
  }

  obtenerPorId(id: number): Observable<Restaurante> {
    return this.http.get<Restaurante>(`${this.base}/${id}`);
  }

  obtenerPorPropietario(propietarioId: number): Observable<Restaurante[]> {
    return this.http.get<Restaurante[]>(`${this.base}/propietario/${propietarioId}`);
  }

  actualizar(id: number, restaurante: RestauranteRequest): Observable<Restaurante> {
    return this.http.put<Restaurante>(`${this.base}/${id}`, restaurante);
  }

  desactivar(id: number): Observable<Restaurante> {
    return this.http.patch<Restaurante>(`${this.base}/${id}/desactivar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── BRANDING ─────────────────────────────────────────────────────────────

  /**
   * Actualiza colores y/o logo del restaurante (PATCH parcial).
   * Solo envía los campos no-nulos.
   */
  actualizarBranding(id: number, branding: BrandingRequest): Observable<Restaurante> {
    return this.http.patch<Restaurante>(`${this.base}/${id}/branding`, branding);
  }

  /**
   * Sube o reemplaza el logo (Base64).
   * @param id  ID del restaurante
   * @param logoBase64  String Base64 completo: "data:image/png;base64,..."
   */
  actualizarLogo(id: number, logoBase64: string): Observable<Restaurante> {
    return this.http.patch<Restaurante>(`${this.base}/${id}/logo`, { logo: logoBase64 });
  }

  /** Elimina el logo del restaurante. */
  eliminarLogo(id: number): Observable<Restaurante> {
    return this.http.delete<Restaurante>(`${this.base}/${id}/logo`);
  }
}
