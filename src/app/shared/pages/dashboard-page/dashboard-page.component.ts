import { Component, HostListener, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../../components/side-menu/side-menu.component';
import { ThemeService } from '../../services/theme.service';

// ── Secciones buscables del POS ─────────────────────────────────────────────

export interface SearchItem {
  label:    string;
  sub:      string;
  icon:     string;
  route:    string;
  keywords: string[];
}

const SEARCH_ITEMS: SearchItem[] = [
  // Ventas
  { label: 'Ventas',           sub: 'Lista de ventas registradas',      icon: 'fa-receipt',         route: '/synthax-pos/venta/listar',           keywords: ['venta','ventas','factura','cobrar','caja','ticket','pago'] },
  { label: 'Nueva Venta',      sub: 'Registrar una nueva venta',        icon: 'fa-plus-circle',     route: '/synthax-pos/venta/registrar',         keywords: ['nueva venta','crear venta','registrar venta','cobrar'] },

  // Productos
  { label: 'Productos',        sub: 'Catálogo de productos',            icon: 'fa-box',             route: '/synthax-pos/producto/listar',         keywords: ['producto','productos','artículo','menú','carta'] },
  { label: 'Nuevo Producto',   sub: 'Agregar producto al catálogo',     icon: 'fa-box-open',        route: '/synthax-pos/producto/registrar',      keywords: ['nuevo producto','crear producto','agregar producto'] },

  // Insumos
  { label: 'Inventario',       sub: 'Lista de insumos y stock',         icon: 'fa-warehouse',       route: '/synthax-pos/insumo/listar',           keywords: ['insumo','insumos','inventario','stock','bodega','materia prima'] },
  { label: 'Nuevo Insumo',     sub: 'Registrar insumo al inventario',   icon: 'fa-plus',            route: '/synthax-pos/insumo/registrar',        keywords: ['nuevo insumo','crear insumo','agregar stock'] },

  // Mesas
  { label: 'Mesas',            sub: 'Gestión de mesas del restaurante', icon: 'fa-utensils',        route: '/synthax-pos/mesa/listar',             keywords: ['mesa','mesas','salon','restaurante','tabla'] },
  { label: 'Nueva Mesa',       sub: 'Agregar una nueva mesa',           icon: 'fa-plus',            route: '/synthax-pos/mesa/registrar',          keywords: ['nueva mesa','crear mesa'] },

  // Pedidos
  { label: 'Pedidos',          sub: 'Lista de pedidos activos',         icon: 'fa-clipboard-list',  route: '/synthax-pos/pedido/listar',           keywords: ['pedido','pedidos','orden','ordenes','comanda'] },
  { label: 'Nuevo Pedido',     sub: 'Registrar un nuevo pedido',        icon: 'fa-clipboard',       route: '/synthax-pos/pedido/registrar',        keywords: ['nuevo pedido','crear pedido'] },

  // Compras
  { label: 'Compras',          sub: 'Historial de compras',             icon: 'fa-shopping-cart',   route: '/synthax-pos/compra/listar',           keywords: ['compra','compras','proveedor','abastecimiento'] },
  { label: 'Nueva Compra',     sub: 'Registrar compra de insumos',      icon: 'fa-cart-plus',       route: '/synthax-pos/compra/registrar',        keywords: ['nueva compra','crear compra','proveedor'] },

  // Usuarios
  { label: 'Usuarios',         sub: 'Gestión de usuarios del sistema',  icon: 'fa-users',           route: '/synthax-pos/usuario/listar',          keywords: ['usuario','usuarios','empleado','mesero','cajero','staff'] },
  { label: 'Nuevo Usuario',    sub: 'Registrar nuevo usuario',          icon: 'fa-user-plus',       route: '/synthax-pos/usuario/registrar',       keywords: ['nuevo usuario','crear usuario','registrar usuario'] },

  // Restaurante
  { label: 'Restaurantes',     sub: 'Administrar restaurantes',         icon: 'fa-store',           route: '/synthax-pos/restaurante/registrar',   keywords: ['restaurante','restaurantes','sucursal','local','sede'] },
  { label: 'Marca / Branding', sub: 'Colores y logo del restaurante',   icon: 'fa-palette',         route: '/synthax-pos/restaurante/branding',    keywords: ['branding','marca','logo','colores','identidad','tema restaurante'] },

  // Geografía
  { label: 'Departamentos',    sub: 'Lista de departamentos',           icon: 'fa-map',             route: '/synthax-pos/departamento/registrar',  keywords: ['departamento','departamentos','región'] },
  { label: 'Municipios',       sub: 'Lista de municipios',              icon: 'fa-city',            route: '/synthax-pos/municipio/registrar',     keywords: ['municipio','municipios','ciudad','localidad'] },

  // Impuestos
  { label: 'Impuestos',        sub: 'Configuración de impuestos',       icon: 'fa-percent',         route: '/synthax-pos/impuesto/registrar',      keywords: ['impuesto','impuestos','iva','tax','tributario'] },

  // Tipo pedido
  { label: 'Tipos de Pedido',  sub: 'Configuración de tipos de pedido', icon: 'fa-tags',            route: '/synthax-pos/tipo-pedido/registrar',   keywords: ['tipo pedido','tipos pedido','domicilio','para llevar','mesa'] },
];

// ────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterOutlet, SideMenuComponent, CommonModule, FormsModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export default class DashboardPageComponent implements OnInit, OnDestroy {

  // ── Injections ─────────────────────────────────────────────────────────────
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  isMenuOpen = false;
  isDesktop = window.innerWidth >= 768;

  // ── Search ─────────────────────────────────────────────────────────────────
  searchTerm = '';
  showSearchDropdown = false;

  get searchResults(): SearchItem[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.sub.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    ).slice(0, 6); // máx 6 resultados
  }

  onSearchInput(): void {
    this.showSearchDropdown = this.searchTerm.trim().length > 0;
    this.showSettingsPanel = false;
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
    this.searchTerm = '';
    this.showSearchDropdown = false;
  }

  // ── Settings panel ─────────────────────────────────────────────────────────
  showSettingsPanel = false;

  toggleSettings(event: Event): void {
    event.stopPropagation();
    this.showSettingsPanel = !this.showSettingsPanel;
    this.showSearchDropdown = false;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.isMenuOpen = this.isDesktop;
  }

  ngOnDestroy(): void {}

  // ── Host listeners ─────────────────────────────────────────────────────────
  @HostListener('window:resize')
  onResize(): void {
    this.isDesktop = window.innerWidth >= 768;
    this.isMenuOpen = this.isDesktop;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showSearchDropdown = false;
    this.showSettingsPanel = false;
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
