import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TipoPedidoService } from '../../services/tipo-pedido.service';
import { TipoPedido } from '../../interfaces/tipo-pedido.interface';
import { TipoPedidoListarPageComponent } from '../tipo-pedido-listar/tipo-pedido-listar';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-tipo-pedido-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TipoPedidoListarPageComponent],
  templateUrl: './tipo-pedido-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class TipoPedidoRegistrarPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tipoPedidoService = inject(TipoPedidoService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  @ViewChild(TipoPedidoListarPageComponent) listarComponent?: TipoPedidoListarPageComponent;

  public editando: boolean = false;
  private tipoPedidoId?: number;

  public myForm: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.minLength(2)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    activo: [true],
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.editando = true;
        this.tipoPedidoId = +id;
        this.tipoPedidoService.obtenerPorId(this.tipoPedidoId).subscribe({
          next: (t) => this.myForm.patchValue(t),
          error: (err) => console.error('Error al cargar tipo de pedido:', err),
        });
      }
    });
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const tipoPedido: TipoPedido = this.myForm.value;

    if (this.editando && this.tipoPedidoId) {
      this.tipoPedidoService.actualizar(this.tipoPedidoId, tipoPedido).subscribe({
        next: () => {
          this.toastService.success('Tipo de pedido actualizado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarTiposPedido();
        },
        error: (err) => {
          console.error('Error:', err);
          this.toastService.error('Error al actualizar: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    } else {
      this.tipoPedidoService.crear(tipoPedido).subscribe({
        next: () => {
          this.toastService.success('Tipo de pedido creado exitosamente');
          this.resetForm();
          this.listarComponent?.cargarTiposPedido();
        },
        error: (err) => {
          console.error('Error:', err);
          this.toastService.error('Error al crear: ' + (err.error?.error || 'Error desconocido'));
        },
      });
    }
  }

  resetForm(): void {
    this.editando = false;
    this.tipoPedidoId = undefined;
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
      }
    }
    return null;
  }
}
