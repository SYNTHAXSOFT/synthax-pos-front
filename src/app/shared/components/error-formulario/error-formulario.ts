import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-error-formulario',
  imports: [JsonPipe],
  templateUrl: './error-formulario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorFormulario { 


  myForm    = input<FormGroup>();
  isLoading = input<boolean>();


}
