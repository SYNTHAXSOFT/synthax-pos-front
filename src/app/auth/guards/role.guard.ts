import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
  const user = this.authService.getCurrentUser();
  const allowedRoles = route.data['roles'] as string[];

  if (!user) {
    this.router.navigate(['/']);
    return false;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // 👇 Redirigir a la ruta por defecto según su rol, no mostrar alert
    const defaultRoute = this.authService.getDefaultRouteByRole();
    this.router.navigate([defaultRoute]);
    return false;
  }

  return true;
}
}