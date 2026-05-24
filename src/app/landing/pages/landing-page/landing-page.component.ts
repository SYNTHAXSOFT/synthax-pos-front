import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { RecaptchaService } from '../../../shared/services/recaptcha.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {

  constructor(
    private readonly http: HttpClient,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  form = {
    nombre:   '',
    negocio:  '',
    telefono: '',
    email:    '',
    ciudad:   '',
    mensaje:  '',
  };

  cargando  = false;
  exito     = false;
  error     = '';

  features = [
    {
      icon: 'fa-cash-register',
      titulo: 'Punto de Venta',
      desc: 'Registra ventas de forma ágil con múltiples formas de pago, descuentos y facturación en segundos.',
    },
    {
      icon: 'fa-bowl-food',
      titulo: 'Gestión de Pedidos',
      desc: 'Envía pedidos directo a cocina, gestiona estados en tiempo real y reduce errores operativos.',
    },
    {
      icon: 'fa-kitchen-set',
      titulo: 'Panel de Cocina',
      desc: 'Dashboard exclusivo para cocineros con alertas automáticas y visualización clara de órdenes activas.',
    },
    {
      icon: 'fa-boxes-stacked',
      titulo: 'Control de Inventario',
      desc: 'Registra compras, lleva stock de insumos y recibe alertas cuando el inventario está bajo.',
    },
    {
      icon: 'fa-chart-line',
      titulo: 'Reportes y Cierres',
      desc: 'Cierres de caja detallados, reportes de ventas por período y análisis de tu negocio en tiempo real.',
    },
    {
      icon: 'fa-users',
      titulo: 'Multi-usuario y Roles',
      desc: 'Propietario, administrador, cajero, mesero, cocinero y domiciliario — cada uno con su acceso exacto.',
    },
    {
      icon: 'fa-store',
      titulo: 'Multi-restaurante',
      desc: 'Un propietario puede gestionar varios establecimientos desde una sola cuenta centralizada.',
    },
    {
      icon: 'fa-mobile-screen',
      titulo: '100% Responsivo',
      desc: 'Funciona en computador, tablet y celular. Tus empleados pueden operar desde cualquier dispositivo.',
    },
  ];

  async enviar(): Promise<void> {
    if (!this.form.nombre || !this.form.email || !this.form.telefono) {
      this.error = 'Por favor completa los campos obligatorios (nombre, email y teléfono).';
      return;
    }
    this.error    = '';
    this.cargando = true;

    // Obtener token reCAPTCHA v3 antes de enviar el formulario
    const recaptchaToken = await this.recaptchaService.execute('contacto');

    this.http.post(`${environment.URL}/auth/contacto`, { ...this.form, recaptchaToken }).subscribe({
      next: () => {
        this.exito    = true;
        this.cargando = false;
        this.form = { nombre: '', negocio: '', telefono: '', email: '', ciudad: '', mensaje: '' };
      },
      error: (err) => {
        this.error    = err.error?.error ?? 'Error al enviar el mensaje. Intenta de nuevo.';
        this.cargando = false;
      },
    });
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
