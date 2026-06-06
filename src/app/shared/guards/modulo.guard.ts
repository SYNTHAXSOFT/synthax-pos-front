import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ModulosService } from '../services/modulos.service';

export const moduloGuard = (modulo: string): CanActivateFn => {
  return () => {
    const modulosService = inject(ModulosService);
    const router = inject(Router);
    if (modulosService.tieneModulo(modulo)) return true;
    return router.createUrlTree(['/moed/inicio']);
  };
};
