import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { routes } from '../../../../app.routes';
import { AuthService } from '../../../../auth/services/auth.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { ModulosService } from '../../../../shared/services/modulos.service';

interface MenuOption {
  icon: string;
  label: string;
  route: string;
  subLabel: string;
  roles?: string[];
}

// Lee las rutas hijas del dashboard (índice 1 = 'moed') — solo una vez, es estático
const allRouteItems = routes[1].children ?? [];

@Component({
  selector: 'app-side-menu-options',
  templateUrl: './side-menu-options.component.html',
  imports: [RouterLink, RouterLinkActive],
})
export class SideMenuOptionsComponent {
  @Output() optionSelected = new EventEmitter<void>();

  private authService     = inject(AuthService);
  private modulosService  = inject(ModulosService);
  private confirmService  = inject(ConfirmService);

  /**
   * Opciones del menú como computed() — se recalcula automáticamente cada vez
   * que cambia el signal modulosHabilitados en ModulosService.
   * Esto resuelve el problema de que los módulos se cargan asincrónicamente
   * después de que el componente ya se inicializó.
   */
  menuOptions = computed<MenuOption[]>(() => {
    return allRouteItems
      // Excluir comodines, redirects y rutas ocultas del menú
      .filter(item =>
        item.path &&
        item.path !== '**' &&
        !item.redirectTo &&
        !item.data?.['hideFromMenu']
      )
      // Filtrar por rol: excluir ítems donde el rol actual está en hideForRoles
      .filter(item => {
        const hideForRoles = item.data?.['hideForRoles'] as string[] | undefined;
        if (!hideForRoles) return true;
        return !this.authService.hasRole(hideForRoles);
      })
      // Filtrar por rol: solo mostrar ítems donde el rol actual está en roles
      .filter(item => {
        const roles = item.data?.['roles'] as string[] | undefined;
        if (!roles) return true;
        return this.authService.hasRole(roles);
      })
      // Filtrar por módulo habilitado — usa el signal, por eso es reactivo
      .filter(item => {
        const requiereModulo = item.data?.['requiereModulo'] as string | undefined;
        if (!requiereModulo) return true;
        return this.modulosService.tieneModulo(requiereModulo);
      })
      // Construir el objeto final de opción de menú
      .map(item => ({
        icon:     this.getIconForRoute(String(item.title ?? '')),
        label:    String(item.title ?? ''),
        subLabel: '',
        route:    `/moed/${item.path}`,
        roles:    item.data?.['roles'] as string[] | undefined,
      }));
  });

  async logout(): Promise<void> {
    const ok = await this.confirmService.confirm({
      message: '¿Estás seguro de cerrar sesión?',
      type: 'danger',
    });
    if (ok) {
      this.authService.logout();
    }
  }

  onSelect(): void {
    this.optionSelected.emit();
  }

  /** Asigna un ícono de Font Awesome según el título del ítem */
  getIconForRoute(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('inicio'))            return 'fa-solid fa-house';
    if (n.includes('usuario'))           return 'fa-solid fa-users';
    if (n.includes('departamento'))      return 'fa-solid fa-map-location-dot';
    if (n.includes('municipio'))         return 'fa-solid fa-city';
    if (n.includes('producto'))          return 'fa-solid fa-box-open';
    if (n.includes('mesa'))              return 'fa-solid fa-chair';
    if (n.includes('tipo'))              return 'fa-solid fa-tags';
    if (n.includes('impuesto'))          return 'fa-solid fa-percent';
    if (n.includes('venta'))             return 'fa-solid fa-cash-register';
    if (n.includes('pedido'))            return 'fa-solid fa-receipt';
    if (n.includes('restaurante'))       return 'fa-solid fa-store';
    if (n.includes('identidad'))         return 'fa-solid fa-palette';
    if (n.includes('branding'))          return 'fa-solid fa-palette';
    if (n.startsWith('control'))         return 'fa-solid fa-chart-line';
    if (n.includes('insumo'))            return 'fa-solid fa-boxes-stacked';
    if (n.includes('compra'))            return 'fa-solid fa-cart-flatbed';
    if (n.includes('cliente'))           return 'fa-solid fa-user-tie';
    if (n.includes('forma'))             return 'fa-solid fa-wallet';
    if (n.includes('pago'))              return 'fa-solid fa-wallet';
    if (n.includes('administr'))         return 'fa-solid fa-screwdriver-wrench';
    if (n.includes('módulo'))            return 'fa-solid fa-toggle-on';
    if (n.includes('modulo'))            return 'fa-solid fa-toggle-on';
    return 'fa-solid fa-circle-dot';
  }
}
