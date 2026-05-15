import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/services/auth.service';
import { LoginRequest } from '../../../auth/interfaces/auth.interface';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-page.component.html',
  styleUrl: './styles.css',
})
export class HomePageComponent implements OnInit {

  credentials: LoginRequest = {
    cedula: '',
    password: ''
  };

  cargando        = false;
  errorMessage    = '';
  showPassword    = false;
  cajaCerrada     = false;
  sesionExpirada  = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Detectar redirección automática por token expirado
    this.sesionExpirada = this.route.snapshot.queryParamMap.get('sesionExpirada') === '1';
  }

  onLogin(): void {
  if (!this.credentials.cedula || !this.credentials.password) {
    this.errorMessage = 'Por favor completa todos los campos';
    return;
  }

  this.cargando    = true;
  this.errorMessage = '';
  this.cajaCerrada  = false;

  this.authService.login(this.credentials).subscribe({
    next: (response) => {
      console.log('Login exitoso:', response);
      const defaultRoute = this.authService.getDefaultRouteByRole();
      this.router.navigate([defaultRoute]);
    },
    error: (error) => {
      console.error('Error en login:', error);
      this.cajaCerrada  = error.error?.codigo === 'CAJA_CERRADA';
      this.errorMessage = error.error?.mensaje || 'Credenciales incorrectas';
      this.cargando     = false;
    },
    complete: () => {
      this.cargando = false;
    }
  });
}
}