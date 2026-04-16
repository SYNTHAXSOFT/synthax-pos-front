import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';

/**
 * Componente de redirección inteligente.
 * Se usa como página raíz del módulo protegido (ruta '') para redirigir
 * a cada rol a su pantalla inicial correspondiente.
 */
@Component({
  standalone: true,
  template: '',
})
export class DefaultRedirectComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  ngOnInit(): void {
    this.router.navigate([this.authService.getDefaultRouteByRole()], { replaceUrl: true });
  }
}
