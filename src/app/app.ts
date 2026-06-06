import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrandingService } from './shared/services/branding.service';
import { ThemeService } from './shared/services/theme.service';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';
import { ModulosService } from './shared/services/modulos.service';
import { AuthService } from './auth/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, ConfirmModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('reactive-forms-app');

  private readonly brandingService = inject(BrandingService);
  private readonly themeService    = inject(ThemeService);
  private readonly modulosService  = inject(ModulosService);
  private readonly authService     = inject(AuthService);

  ngOnInit(): void {
    // Restaurar el branding del restaurante activo al recargar la página
    this.brandingService.init();
    // Restaurar el tema (oscuro/claro) guardado en localStorage
    this.themeService.init();
    // Cargar módulos habilitados si hay una sesión activa
    if (this.authService.isAuthenticated()) {
      this.modulosService.cargarModulos().subscribe();
    }
  }
}
