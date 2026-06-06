import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModulosService } from '../../services/modulos.service';
import { MODULOS } from '../../constants/modulos.constants';

@Component({
  selector: 'app-administracion-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './administracion-page.component.html',
})
export class AdministracionPageComponent {
  private readonly modulosService = inject(ModulosService);
  readonly MODULOS = MODULOS;

  tieneModulo(modulo: string): boolean {
    return this.modulosService.tieneModulo(modulo);
  }
}
