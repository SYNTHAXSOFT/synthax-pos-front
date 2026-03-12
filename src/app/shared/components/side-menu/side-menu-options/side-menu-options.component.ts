import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { routes } from '../../../../app.routes';
import { AuthService } from '../../../../auth/services/auth.service';

interface MenuOption {
  icon: string;
  label: string;
  route: string;
  subLabel: string;
  roles?: string[];
}

interface MenuItem {
  title: string;
  route: string;
  roles?: string[];
}

// Lee las rutas hijas del dashboard (índice 1 = 'synthax-pos')
const reactiveItems = routes[1].children ?? [];

@Component({
  selector: 'app-side-menu-options',
  templateUrl: './side-menu-options.component.html',
  imports: [RouterLink, RouterLinkActive],
})
export class SideMenuOptionsComponent {
  @Output() optionSelected = new EventEmitter<void>();

  private authService = inject(AuthService);

  // Genera los ítems del menú desde las rutas, excluyendo comodines y redirects
  reactiveMenu: MenuItem[] = reactiveItems
    .filter((item) => item.path && item.path !== '**' && !item.redirectTo)
    .map((item) => ({
      route: `synthax-pos/${item.path}`,   // prefijo actualizado a synthax-pos
      title: `${item.title}`,
      roles: item.data?.['roles'] as string[],
    }));

  // Filtra el menú según el rol del usuario logueado
  menuOptions: MenuOption[] = this.reactiveMenu
    .filter((item) => {
      if (!item.roles) return true;
      return this.authService.hasRole(item.roles);
    })
    .map((item) => ({
      icon:     this.getIconForRoute(item.title),
      label:    item.title,
      subLabel: '',
      route:    `/${item.route}`,
      roles:    item.roles,
    }));

  logout(): void {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      this.authService.logout();
    }
  }

  onSelect() {
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
    return 'fa-solid fa-circle-dot';
  }
}
