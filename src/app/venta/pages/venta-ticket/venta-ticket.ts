import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Venta } from '../../interfaces/venta.interface';
import { BrandingService, RestauranteBranding } from '../../../shared/services/branding.service';
import { AuthService } from '../../../auth/services/auth.service';

/**
 * Componente de ticket / factura imprimible con branding dinámico.
 *
 * Uso:
 *  <app-venta-ticket [venta]="ventaSeleccionada"></app-venta-ticket>
 *
 * El componente lee el branding activo del BrandingService y aplica
 * los colores y logo del restaurante al momento de renderizar.
 * Al imprimir (window.print) solo se imprime el ticket.
 */
@Component({
  selector: 'app-venta-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './venta-ticket.html',
  styles: [`
    @media print {
      body > * { display: none !important; }
      app-venta-ticket,
      app-venta-ticket * { display: block !important; visibility: visible !important; }
      .no-print { display: none !important; }
      .ticket-wrapper {
        position: fixed; top: 0; left: 0;
        width: 100%; max-width: 80mm;
        font-size: 11pt;
      }
    }
  `],
})
export class VentaTicketComponent implements OnInit {

  @Input() venta: Venta | null = null;

  private readonly brandingService = inject(BrandingService);
  private readonly authService     = inject(AuthService);

  branding!: RestauranteBranding;
  restauranteNombre = '';
  restauranteTelefono = '';
  restauranteCorreo   = '';
  fechaImpresion = new Date();

  ngOnInit(): void {
    this.branding           = this.brandingService.getBranding();
    const rest              = this.authService.getCurrentRestaurante();
    this.restauranteNombre  = rest?.nombre    ?? this.branding.nombre    ?? 'SYNTHAX POS';
    this.restauranteTelefono = rest?.telefono  ?? '';
    this.restauranteCorreo   = rest?.correo    ?? '';
  }

  imprimir(): void {
    window.print();
  }

  /** Formatea moneda COP. */
  formatCOP(value: number | undefined): string {
    if (value == null) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(value);
  }
}
