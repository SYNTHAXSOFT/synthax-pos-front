import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { BrandingService } from '../../../services/branding.service';
import { RestauranteLogin } from '../../../../auth/interfaces/auth.interface';

@Component({
  selector: 'app-side-menu-header',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './side-menu-header.component.html',
  styleUrls: ['./side-menu-header.component.css']
})
export class SideMenuHeaderComponent implements OnInit, OnDestroy {

  private authService     = inject(AuthService);
  private brandingService = inject(BrandingService);

  currentUser: any              = null;
  homeRoute: string             = '/synthax-pos/inicio';
  restauranteNombre             = '';
  restauranteLogo: string | null = null;
  restaurantes: RestauranteLogin[] = [];
  restauranteActivoId: number | null = null;

  private sub?: Subscription;

  ngOnInit(): void {
    this.currentUser  = this.authService.getCurrentUser();
    this.homeRoute    = this.authService.getDefaultRouteByRole();
    this.restaurantes = this.authService.getRestaurantes();

    // Inicializar con el restaurante activo actual
    this.actualizarDesde(this.authService.getCurrentRestaurante());

    // Reaccionar a cambios de restaurante activo
    this.sub = this.authService.restauranteActivo$.subscribe(r => {
      if (r) this.actualizarDesde(r);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private actualizarDesde(r: RestauranteLogin | null): void {
    if (!r) return;
    this.restauranteNombre   = r.nombre;
    this.restauranteLogo     = r.logo ?? null;
    // Garantizar tipo number para que [selected]="r.id === restauranteActivoId" funcione
    this.restauranteActivoId = Number(r.id);
  }

  get esPropietarioMulti(): boolean {
    return this.currentUser?.rol === 'PROPIETARIO' && this.restaurantes.length > 1;
  }

  onCambiarRestaurante(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const seleccionado = this.restaurantes.find(r => r.id === id);
    if (!seleccionado) return;
    this.authService.setRestauranteActivo(seleccionado);
    this.actualizarDesde(seleccionado);
    // Forzar recarga completa para que todos los servicios se reinicialicen con el nuevo restaurante.
    // Si ya estamos en /#/synthax-pos/inicio, href a la misma URL no recarga → usar reload().
    const targetHash = '#/synthax-pos/inicio';
    if (window.location.hash === targetHash) {
      window.location.reload();
    } else {
      window.location.href = '/' + targetHash;
    }
  }

  get fullName(): string {
    if (!this.currentUser) return 'Usuario';
    return `${this.currentUser.nombre} ${this.currentUser.apellido ?? ''}`.trim();
  }

  get userRole(): string {
    return this.currentUser?.rol ?? '';
  }
}
