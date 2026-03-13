import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, RestauranteLogin } from '../interfaces/auth.interface';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { BrandingService } from '../../shared/services/branding.service';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly USER_KEY        = 'current_user';
  private readonly TOKEN_KEY       = 'auth_token';
  private readonly RESTAURANTE_KEY = 'current_restaurante';

  private readonly http            = inject(HttpClient);
  private readonly router          = inject(Router);
  private readonly brandingService = inject(BrandingService);

  // ── Autenticación ─────────────────────────────────────────────────────────

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.URL}/${API_ENDPOINTS.AUTH}/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem(this.USER_KEY,        JSON.stringify(response.usuario));
          localStorage.setItem(this.TOKEN_KEY,       response.token);
          localStorage.setItem(this.RESTAURANTE_KEY, JSON.stringify(response.restaurante ?? null));

          // Aplicar branding del restaurante al DOM inmediatamente
          if (response.restaurante) {
            this.brandingService.setBranding({
              colorPrimario:   response.restaurante.colorPrimario   ?? '#059669',
              colorSecundario: response.restaurante.colorSecundario ?? '#f97316',
              colorTexto:      response.restaurante.colorTexto      ?? '#ffffff',
              colorFondo:      response.restaurante.colorFondo      ?? '#f0fdf4',
              logo:            response.restaurante.logo            ?? null,
              nombre:          response.restaurante.nombre,
            });
          } else {
            // ROOT sin restaurante → tema por defecto
            this.brandingService.clearBranding();
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.RESTAURANTE_KEY);
    this.brandingService.clearBranding();
    this.router.navigate(['/']);
  }

  // ── Helpers de sesión ─────────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.USER_KEY) && !!this.getToken();
  }

  getCurrentUser(): any {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getCurrentRestaurante(): RestauranteLogin | null {
    const raw = localStorage.getItem(this.RESTAURANTE_KEY);
    if (!raw || raw === 'null') return null;
    try { return JSON.parse(raw); }
    catch { return null; }
  }

  hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user && roles.includes(user.rol);
  }

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.rol : null;
  }

  getUserId(): number | null {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  getRestauranteId(): number | null {
    const rest = this.getCurrentRestaurante();
    return rest ? rest.id : null;
  }

  /** Ruta de inicio según el rol del usuario logueado. */
  getDefaultRouteByRole(): string {
    const user = this.getCurrentUser();
    if (!user) return '/';
    return '/synthax-pos/inicio';
  }
}
