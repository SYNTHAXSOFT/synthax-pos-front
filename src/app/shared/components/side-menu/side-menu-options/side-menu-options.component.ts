import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { routes } from '../../../../app.routes';
import { AuthService } from '../../../../auth/services/auth.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

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
  private readonly confirmService = inject(ConfirmService);

  // Genera los ítems del menú desde las rutas, excluyendo comodines, redirects,
  // los marcados con hideFromMenu y los que no aplican para el rol actual (hideForRoles)
  reactiveMenu: MenuItem[] = reactiveItems
    .filter((item) => item.path && item.path !== '**' && !item.redirectTo && !item.data?.['hideFromMenu'])
    .filter((item) => {
      const hideForRoles = item.data?.['hideForRoles'] as string[] | undefined;
      if (!hideForRoles) return true;
      return !this.authService.hasRole(hideForRoles);
    })
    .map((item) => ({
      route: `synthax-pos/${item.path}`,
      title: `${item.title}`,
      roles: item.data?.['roles'] as string[],
    }));

  // Filtra además según qué roles tienen permiso de ver cada ítem
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

  async logout(): Promise<void> {
    const ok = await this.confirmService.confirm({ message: '¿Estás seguro de cerrar sesión?', type: 'danger' });
    if (ok) {
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
    if (n.includes('restaurante'))       return 'fa-solid fa-store';
    if (n.includes('identidad'))         return 'fa-solid fa-palette';
    if (n.includes('branding'))          return 'fa-solid fa-palette';
    if (n.includes('insumo'))            return 'fa-solid fa-boxes-stacked';
    if (n.includes('compra'))            return 'fa-solid fa-cart-flatbed';
    if (n.includes('cliente'))           return 'fa-solid fa-user-tie';
    if (n.includes('forma'))             return 'fa-solid fa-wallet';
    if (n.includes('pago'))              return 'fa-solid fa-wallet';
    return 'fa-solid fa-circle-dot';
  }
}
