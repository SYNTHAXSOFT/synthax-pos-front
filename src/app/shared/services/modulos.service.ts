import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class ModulosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private modulosHabilitados = signal<Set<string>>(new Set());

  cargarModulos(): Observable<string[]> {
    const restauranteId = this.authService.getRestauranteId();
    if (!restauranteId) {
      this.modulosHabilitados.set(new Set());
      return of([]);
    }
    return this.http.get<string[]>(
      `${environment.URL}/modulos/mis-modulos`,
      { headers: { 'Restaurante-Id': String(restauranteId) } }
    ).pipe(
      tap(modulos => this.modulosHabilitados.set(new Set(modulos))),
      catchError(() => {
        this.modulosHabilitados.set(new Set());
        return of([]);
      })
    );
  }

  tieneModulo(modulo: string): boolean {
    // ROOT always has access to everything
    if (this.authService.hasRole(['ROOT'])) return true;
    return this.modulosHabilitados().has(modulo);
  }

  limpiar(): void {
    this.modulosHabilitados.set(new Set());
  }
}
