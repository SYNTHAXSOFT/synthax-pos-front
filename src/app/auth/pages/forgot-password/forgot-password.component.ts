import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {

  private readonly authService = inject(AuthService);

  email     = '';
  cargando  = false;
  enviado   = false;
  error     = '';

  enviar(): void {
    if (!this.email.trim()) {
      this.error = 'Por favor ingresa tu correo electrónico.';
      return;
    }
    this.error    = '';
    this.cargando = true;

    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: () => {
        this.enviado  = true;
        this.cargando = false;
      },
      error: () => {
        // El backend siempre responde 200 — este error sería de red
        this.enviado  = true; // mostramos éxito igual (por seguridad)
        this.cargando = false;
      },
    });
  }
}
