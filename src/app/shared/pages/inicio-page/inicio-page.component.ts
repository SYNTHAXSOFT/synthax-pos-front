import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio-page.component.html',
  styleUrls: ['./inicio-page.component.css']
})
export class InicioPageComponent {
  private authService = inject(AuthService);

  todayStr = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  get userName(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return 'Usuario';
    return `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || 'Usuario';
  }

  get restaurantName(): string {
    return this.authService.getCurrentRestaurante()?.nombre ?? 'SYNTHAX POS';
  }
}
