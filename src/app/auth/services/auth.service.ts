import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse } from '../interfaces/auth.interface';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private readonly USER_KEY = 'current_user';
  private readonly TOKEN_KEY = 'auth_token';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.URL}/${API_ENDPOINTS.AUTH}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.usuario));
        localStorage.setItem(this.TOKEN_KEY, response.token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/']);
  }

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

  getCandidatoId(): number | null {
    const user = this.getCurrentUser();
    return user && user.candidato ? user.candidato.id : null;
  }

  getDefaultRouteByRole(): string {
    const user = this.getCurrentUser();
    if (!user) return '/';

    switch (user.rol) {
      case 'ROOT':
      case 'ADMINISTRADOR':
        return '/synthax-votos/inicio';
      case 'CANDIDATO':
        return '/synthax-votos/inicio';
      case 'TESTIGO':
        return '/synthax-votos/inicio';
      default:
        return '/synthax-votos';
    }
  }
}