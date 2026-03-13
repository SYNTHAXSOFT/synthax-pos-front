import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrandingService } from './shared/services/branding.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('reactive-forms-app');

  private readonly brandingService = inject(BrandingService);

  ngOnInit(): void {
    // Restaurar el branding del restaurante activo al recargar la página
    this.brandingService.init();
  }
}
