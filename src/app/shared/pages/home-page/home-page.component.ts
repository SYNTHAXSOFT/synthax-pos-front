import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/services/auth.service';
import { LoginRequest } from '../../../auth/interfaces/auth.interface';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {

  credentials: LoginRequest = {
    cedula: '',
    password: ''
  };

  cargando = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
  if (!this.credentials.cedula || !this.credentials.password) {
    this.errorMessage = 'Por favor completa todos los campos';
    return;
  }

  this.cargando = true;
  this.errorMessage = '';

  this.authService.login(this.credentials).subscribe({
    next: (response) => {
      console.log('Login exitoso:', response);
      const defaultRoute = this.authService.getDefaultRouteByRole();
      this.router.navigate([defaultRoute]);
    },
    error: (error) => {
      console.error('Error en login:', error);
      this.errorMessage = error.error?.mensaje || 'Credenciales incorrectas';
      this.cargando = false;
    },
    complete: () => {
      this.cargando = false;
    }
  });
}
}