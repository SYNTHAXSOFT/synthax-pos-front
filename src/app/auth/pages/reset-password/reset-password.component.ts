import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);

  token           = '';
  password        = '';
  confirmPassword = '';
  showPassword    = false;
  showConfirm     = false;
  cargando        = false;
  exito           = false;
  error           = '';
  tokenInvalido   = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenInvalido = true;
      this.error = 'El enlace de recuperación no es válido o ha expirado.';
    }
  }

  restablecer(): void {
    if (!this.password || this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.error    = '';
    this.cargando = true;

    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.exito    = true;
        this.cargando = false;
        // Redirigir al login después de 3 segundos
        setTimeout(() => this.router.navigate(['/']), 3000);
      },
      error: (err) => {
        this.error    = err.error?.error ?? 'El enlace ha expirado o no es válido. Solicita uno nuevo.';
        this.cargando = false;
      },
    });
  }
}
