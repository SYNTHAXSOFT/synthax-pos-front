import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-mensaje-informativo',
  imports: [],
  templateUrl: './mensaje-informativo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensajeInformativo { 
  icono    = input<string>();
  mensaje  = input<string>();
}
