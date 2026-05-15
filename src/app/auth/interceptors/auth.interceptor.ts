import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor HTTP global.
 *
 * Adjunta automáticamente a todas las peticiones (excepto login):
 *  - Authorization: Bearer <token JWT>
 *  - Usuario-Id: <id del usuario logueado>
 *  - Restaurante-Id: <id del restaurante activo> (si aplica)
 *
 * También detecta respuestas 401/403 por token expirado o inválido:
 * limpia la sesión local y redirige al login automáticamente.
 */
export function authInterceptor(): HttpInterceptorFn {
  return (req, next) => {
    const router   = inject(Router);
    const isLogin  = req.url.includes('/auth/login');

    const token      = localStorage.getItem('auth_token');
    const rawUser    = localStorage.getItem('current_user');
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    const userId     = parsedUser?.id  ?? null;
    const userRol    = parsedUser?.rol ?? null;

    const rawRestaurante = localStorage.getItem('current_restaurante');
    let restauranteId: number | null = null;
    if (rawRestaurante && rawRestaurante !== 'null') {
      try {
        const parsed = JSON.parse(rawRestaurante);
        restauranteId = parsed?.id ?? null;
      } catch {
        restauranteId = null;
      }
    }

    if (token && !isLogin) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (userId     != null) headers['Usuario-Id']    = String(userId);
      if (userRol    != null) headers['Usuario-Rol']   = String(userRol);
      if (restauranteId != null) headers['Restaurante-Id'] = String(restauranteId);

      const authReq = req.clone({ setHeaders: headers });

      return next(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
          // Solo 401 indica token expirado o inválido → cerrar sesión automáticamente.
          // 403 significa "autenticado pero sin permiso para este recurso" — NO es sesión expirada.
          if (err.status === 401 && !isLogin) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            localStorage.removeItem('current_restaurante');
            localStorage.removeItem('restaurantes_list');
            router.navigate(['/'], { queryParams: { sesionExpirada: '1' } });
          }
          return throwError(() => err);
        })
      );
    }

    return next(req);
  };
}
