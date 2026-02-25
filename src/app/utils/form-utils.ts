import { FormArray, FormGroup, ValidationErrors } from "@angular/forms";

export class Formutils {

  static isValidField(form: FormGroup, fieldName: string): boolean | null | undefined {
      return (
        form.get(fieldName)?.errors &&
        form.get(fieldName)?.touched
      );
  }

  static getFieldError(form: FormGroup, fieldName: string): string | null{
    if(!form.get(fieldName)) return null;

    const errors = form.get(fieldName)?.errors ?? {};

    return this.getTextError(errors);
  }

  static isValidFieldArray(formArray: FormArray, index: number): boolean | null | undefined {
      return (
        formArray.controls[index]?.errors &&
        formArray.controls[index]?.touched
      );
  }

  static getFieldErrorArray(formArray: FormArray, index: number): string | null{
    if(!formArray.controls[index]) return null;

    const errors = formArray.controls[index]?.errors ?? {};

    return this.getTextError(errors);
  }

  static getTextError(errors: ValidationErrors): string | null{
    for(const key of Object.keys(errors)){
      switch(key){
        case 'required':
          return 'este campo es requerido';

        case 'minlength':
          return `Mínimo de ${errors['minlength'].requiredLength} caracteres`

        case 'min':
          return `Valor mínimo de ${errors['min'].min}`;
      }
    }

    return null;
  }

}
