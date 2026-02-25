import { HttpInterceptorFn } from '@angular/common/http';

export function authInterceptor(): HttpInterceptorFn {
  return (req, next) => {
    // Leer token DIRECTAMENTE (sin inyectar AuthService)
    const token = localStorage.getItem('auth_token'); // <- usa la misma key que pones al loguear

    // Ignorar ruta de login para evitar meter header ahí
    if (token && !req.url.includes('/auth/login')) {
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(authReq);
    }

    return next(req);
  };
}