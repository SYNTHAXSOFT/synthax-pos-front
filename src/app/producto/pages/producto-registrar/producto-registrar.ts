import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../interfaces/producto.interface';
import { ProductoListarPageComponent } from '../producto-listar/producto-listar';

@Component({
  selector: 'app-producto-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProductoListarPageComponent],
  templateUrl: './producto-registrar.html',
})
export class ProductoRegistrarPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild(ProductoListarPageComponent) listarComponent?: ProductoListarPageComponent;

  public editando: boolean = false;
  private productoId?: number;

  public myForm: FormGroup = this.fb.group({
    codigo:      ['', [Validators.required, Validators.minLength(2)]],
    nombre:      ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required]],
    precio:      [null, [Validators.required, Validators.min(0)]],
    imagen:      [''],
    activo:      [true],
  });

  ngOnInit(): void {
    // Si viene con queryParam ?id=X cargamos el producto para editar
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.editando = true;
        this.productoId = +id;
        this.productoService.obtenerPorId(this.productoId).subscribe({
          next: (p) => this.myForm.patchValue(p),
          error: (err) => console.error('Error al cargar producto:', err),
        });
      }
    });
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const producto: Producto = this.myForm.value;

    if (this.editando && this.productoId) {
      this.productoService.actualizar(this.productoId, producto).subscribe({
        next: () => {
          alert('Producto actualizado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarProductos();
        },
        error: (err) => {
          console.error('Error:', err);
          alert('Error al actualizar: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    } else {
      this.productoService.crear(producto).subscribe({
        next: () => {
          alert('Producto creado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarProductos();
        },
        error: (err) => {
          console.error('Error:', err);
          alert('Error al crear: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    }
  }

  resetForm(): void {
    this.editando = false;
    this.productoId = undefined;
    this.myForm.reset({ activo: true });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }

  getFieldError(field: string): string | null {
    if (!this.myForm.controls[field]) return null;
    const errors = this.myForm.controls[field].errors || {};
    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required':  return 'Este campo es requerido';
        case 'minlength': return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
        case 'min':       return `El valor mínimo es ${errors['min'].min}`;
      }
    }
    return null;
  }
}
