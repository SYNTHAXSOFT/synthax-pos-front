import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor HTTP global.
 *
 * Adjunta automáticamente a todas las peticiones (excepto login):
 *  - Authorization: Bearer <token JWT>
 *  - Usuario-Id: <id del usuario logueado>
 *
 * El header "Usuario-Id" es necesario para los endpoints que aplican
 * las reglas de propiedad por restaurante (crear mesas, productos,
 * usuarios, etc.). Spring Security valida el JWT por su cuenta;
 * "Usuario-Id" es un header de contexto adicional para la lógica de negocio.
 */
export function authInterceptor(): HttpInterceptorFn {
  return (req, next) => {
    const isLogin = req.url.includes('/auth/login');

    const token  = localStorage.getItem('auth_token');
    const rawUser = localStorage.getItem('current_user');
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    const userId  = parsedUser?.id ?? null;
    const userRol = parsedUser?.rol ?? null;

    const rawRestaurante = localStorage.getItem('current_restaurante');
    const parsedRestaurante = rawRestaurante && rawRestaurante !== 'null'
      ? (() => { try { return JSON.parse(rawRestaurante); } catch { return null; } })()
      : null;
    const restauranteId = parsedRestaurante?.id ?? null;

    if (token && !isLogin) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      // Añadir Usuario-Id y Usuario-Rol (requeridos por los endpoints de gestión)
      if (userId != null) {
        headers['Usuario-Id'] = String(userId);
      }
      if (userRol != null) {
        headers['Usuario-Rol'] = String(userRol);
      }
      // Restaurante-Id: permite al backend filtrar datos del restaurante activo
      // (crítico para PROPIETARIO con múltiples restaurantes)
      if (restauranteId != null) {
        headers['Restaurante-Id'] = String(restauranteId);
      }

      const authReq = req.clone({ setHeaders: headers });
      return next(authReq);
    }

    return next(req);
  };
}
