import { Injectable, inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, RestauranteLogin } from '../interfaces/auth.interface';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../utils/constantes-utils';
import { BrandingService } from '../../shared/services/branding.service';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly USER_KEY         = 'current_user';
  private readonly TOKEN_KEY        = 'auth_token';
  private readonly RESTAURANTE_KEY  = 'current_restaurante';
  private readonly RESTAURANTES_KEY = 'restaurantes_list';

  private readonly http            = inject(HttpClient);
  private readonly router          = inject(Router);
  private readonly brandingService = inject(BrandingService);
  private readonly injector        = inject(Injector);

  /** Emite cada vez que el propietario cambia de restaurante activo. */
  readonly restauranteActivo$ = new BehaviorSubject<RestauranteLogin | null>(null);

  // ── Autenticación ─────────────────────────────────────────────────────────

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.URL}/${API_ENDPOINTS.AUTH}/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem(this.USER_KEY,         JSON.stringify(response.usuario));
          localStorage.setItem(this.TOKEN_KEY,        response.token);
          localStorage.setItem(this.RESTAURANTE_KEY,  JSON.stringify(response.restaurante ?? null));
          localStorage.setItem(this.RESTAURANTES_KEY, JSON.stringify(response.restaurantes ?? []));

          if (response.restaurante) {
            this.aplicarBranding(response.restaurante);
            this.restauranteActivo$.next(response.restaurante);
          } else {
            this.brandingService.clearBranding();
            this.restauranteActivo$.next(null);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.RESTAURANTE_KEY);
    localStorage.removeItem(this.RESTAURANTES_KEY);
    this.brandingService.clearBranding();
    this.restauranteActivo$.next(null);
    import('../../caja/services/caja.service').then(({ CajaService }) => {
      this.injector.get(CajaService).invalidarEstado();
    });
    this.router.navigate(['/']);
  }

  // ── Selector de sucursal ──────────────────────────────────────────────────

  /** Lista de restaurantes disponibles para el propietario logueado. */
  getRestaurantes(): RestauranteLogin[] {
    const raw = localStorage.getItem(this.RESTAURANTES_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  /** Cambia el restaurante activo, aplica su branding y notifica a los suscriptores. */
  setRestauranteActivo(restaurante: RestauranteLogin): void {
    localStorage.setItem(this.RESTAURANTE_KEY, JSON.stringify(restaurante));
    this.aplicarBranding(restaurante);
    this.restauranteActivo$.next(restaurante);
  }

  private aplicarBranding(r: RestauranteLogin): void {
    this.brandingService.setBranding({
      colorPrimario:   r.colorPrimario   ?? '#059669',
      colorSecundario: r.colorSecundario ?? '#f97316',
      colorTexto:      r.colorTexto      ?? '#ffffff',
      colorFondo:      r.colorFondo      ?? '#f0fdf4',
      logo:            r.logo            ?? null,
      nombre:          r.nombre,
    });
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
    try { return JSON.parse(raw); } catch { return null; }
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

  /**
   * Actualiza los datos del usuario en la sesión local (localStorage).
   * Útil para reflejar cambios de nombre, foto, etc. sin necesidad de re-login.
   */
  actualizarUsuarioEnSesion(parcial: Partial<{ fotoPerfil: string | null; nombre: string; apellido: string }>): void {
    const user = this.getCurrentUser();
    if (!user) return;
    const updated = { ...user, ...parcial };
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
  }

  /** Ruta de inicio según el rol del usuario logueado. */
  getDefaultRouteByRole(): string {
    const user = this.getCurrentUser();
    if (!user) return '/';
    if (user.rol === 'ROOT')         return '/synthax-pos/restaurante/listar';
    if (user.rol === 'COCINERO')     return '/synthax-pos/venta/listar';
    if (user.rol === 'DOMICILIARIO') return '/synthax-pos/venta/listar';
    return '/synthax-pos/inicio';
  }
}
