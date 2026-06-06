import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ModulosService } from '../../shared/services/modulos.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private modulosService: ModulosService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthenticated()) {
      // Cargar módulos si aún no se han cargado (primer acceso tras login)
      this.modulosService.cargarModulos().subscribe();
      return true; // Usuario autenticado, permite el acceso
    }

    // No autenticado, redirige al login
    this.router.navigate(['/']);
    return false;
  }
}