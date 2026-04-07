import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajaService } from '../../services/caja.service';
import { CajaSesion } from '../../interfaces/caja.interface';

@Component({
  selector: 'app-apertura-caja-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apertura-caja-modal.component.html',
  styleUrls: ['./apertura-caja-modal.component.css']
})
export class AperturaCajaModalComponent {

  @Output() cerrado    = new EventEmitter<void>();
  @Output() aperturado = new EventEmitter<CajaSesion>();

  private cajaService = inject(CajaService);

  montoInicial: number | null = null;
  cargando  = false;
  error     = '';

  aperturar(): void {
    if (this.montoInicial === null || this.montoInicial < 0) {
      this.error = 'Ingresa un monto inicial válido (puede ser $0).';
      return;
    }

    this.cargando = true;
    this.error    = '';

    this.cajaService.aperturar({ montoInicial: this.montoInicial }).subscribe({
      next: (sesion) => {
        this.cargando = false;
        this.aperturado.emit(sesion);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.mensaje ?? 'Error al aperturar la caja. Inténtalo de nuevo.';
      }
    });
  }

  cancelar(): void {
    this.cerrado.emit();
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(n);
  }
}
