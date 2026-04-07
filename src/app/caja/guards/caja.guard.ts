import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth.service';
import { CajaService } from '../services/caja.service';

/**
 * Bloquea el acceso a cualquier ruta operativa mientras la caja esté cerrada.
 * Solo permite navegar a /synthax-pos/inicio (donde está el botón de apertura).
 *
 * ROOT nunca es bloqueado (no está ligado a un restaurante con caja).
 */
@Injectable({ providedIn: 'root' })
export class CajaGuard implements CanActivate {
  private authService = inject(AuthService);
  private cajaService = inject(CajaService);
  private router      = inject(Router);

  canActivate(): Observable<boolean> | boolean {
    // ROOT no tiene caja — acceso siempre permitido
    if (this.authService.hasRole(['ROOT'])) return true;

    // Si no hay restaurante asignado, no aplica
    const restauranteId = this.authService.getRestauranteId();
    if (!restauranteId) return true;

    const estadoCacheado = this.cajaService.cajaAbierta();

    // Si ya tenemos el estado en memoria, usarlo directamente
    if (estadoCacheado !== null) {
      return this.evaluarEstado(estadoCacheado);
    }

    // Si no está cacheado, consultar al backend
    return this.cajaService.obtenerEstado().pipe(
      map(res => this.evaluarEstado(res.abierta)),
      catchError(() => {
        // En caso de error de red, redirigir a inicio como precaución
        this.router.navigate(['/synthax-pos/inicio']);
        return of(false);
      })
    );
  }

  private evaluarEstado(abierta: boolean): boolean {
    if (abierta) return true;
    this.router.navigate(['/synthax-pos/inicio']);
    return false;
  }
}
