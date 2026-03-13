import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../auth/services/auth.service';
import { BrandingService } from '../../../services/branding.service';

@Component({
  selector: 'app-side-menu-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './side-menu-header.component.html',
  styleUrls: ['./side-menu-header.component.css']
})
export class SideMenuHeaderComponent implements OnInit {

  private authService    = inject(AuthService);
  private brandingService = inject(BrandingService);
  private router         = inject(Router);

  currentUser: any        = null;
  homeRoute: string       = '/synthax-pos/inicio';
  restauranteNombre       = '';
  restauranteLogo: string | null = null;

  ngOnInit(): void {
    this.currentUser    = this.authService.getCurrentUser();
    this.homeRoute      = this.authService.getDefaultRouteByRole();

    // Cargar branding activo
    const branding          = this.brandingService.getBranding();
    this.restauranteNombre  = branding.nombre ?? 'SYNTHAX POS';
    this.restauranteLogo    = branding.logo   ?? null;
  }

  get fullName(): string {
    if (!this.currentUser) return 'Usuario';
    return `${this.currentUser.nombre} ${this.currentUser.apellido ?? ''}`.trim();
  }

  get userRole(): string {
    return this.currentUser?.rol ?? '';
  }
}
