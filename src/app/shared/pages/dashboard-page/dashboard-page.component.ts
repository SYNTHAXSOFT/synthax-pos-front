import { Component, ElementRef, HostListener, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../../components/side-menu/side-menu.component';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../../auth/services/auth.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { ToastService } from '../../services/toast.service';

// ── Secciones buscables del POS ─────────────────────────────────────────────

export interface SearchItem {
  label:    string;
  sub:      string;
  icon:     string;
  route:    string;
  keywords: string[];
}

const SEARCH_ITEMS: SearchItem[] = [
  { label: 'Ventas',           sub: 'Lista de ventas registradas',      icon: 'fa-receipt',         route: '/synthax-pos/venta/listar',           keywords: ['venta','ventas','factura','cobrar','caja','ticket','pago'] },
  { label: 'Nueva Venta',      sub: 'Registrar una nueva venta',        icon: 'fa-plus-circle',     route: '/synthax-pos/venta/registrar',         keywords: ['nueva venta','crear venta','registrar venta','cobrar'] },
  { label: 'Productos',        sub: 'Catálogo de productos',            icon: 'fa-box',             route: '/synthax-pos/producto/listar',         keywords: ['producto','productos','artículo','menú','carta'] },
  { label: 'Nuevo Producto',   sub: 'Agregar producto al catálogo',     icon: 'fa-box-open',        route: '/synthax-pos/producto/registrar',      keywords: ['nuevo producto','crear producto','agregar producto'] },
  { label: 'Inventario',       sub: 'Lista de insumos y stock',         icon: 'fa-warehouse',       route: '/synthax-pos/insumo/listar',           keywords: ['insumo','insumos','inventario','stock','bodega','materia prima'] },
  { label: 'Nuevo Insumo',     sub: 'Registrar insumo al inventario',   icon: 'fa-plus',            route: '/synthax-pos/insumo/registrar',        keywords: ['nuevo insumo','crear insumo','agregar stock'] },
  { label: 'Mesas',            sub: 'Gestión de mesas del restaurante', icon: 'fa-utensils',        route: '/synthax-pos/mesa/listar',             keywords: ['mesa','mesas','salon','restaurante','tabla'] },
  { label: 'Nueva Mesa',       sub: 'Agregar una nueva mesa',           icon: 'fa-plus',            route: '/synthax-pos/mesa/registrar',          keywords: ['nueva mesa','crear mesa'] },
  { label: 'Pedidos',          sub: 'Lista de pedidos activos',         icon: 'fa-clipboard-list',  route: '/synthax-pos/pedido/listar',           keywords: ['pedido','pedidos','orden','ordenes','comanda'] },
  { label: 'Compras',          sub: 'Historial de compras',             icon: 'fa-shopping-cart',   route: '/synthax-pos/compra/listar',           keywords: ['compra','compras','proveedor','abastecimiento'] },
  { label: 'Nueva Compra',     sub: 'Registrar compra de insumos',      icon: 'fa-cart-plus',       route: '/synthax-pos/compra/registrar',        keywords: ['nueva compra','crear compra','proveedor'] },
  { label: 'Clientes',         sub: 'Gestión de clientes',              icon: 'fa-user-tie',        route: '/synthax-pos/cliente',                 keywords: ['cliente','clientes','consumidor','comprador'] },
  { label: 'Usuarios',         sub: 'Gestión de usuarios del sistema',  icon: 'fa-users',           route: '/synthax-pos/usuario/listar',          keywords: ['usuario','usuarios','empleado','mesero','cajero','staff'] },
  { label: 'Nuevo Usuario',    sub: 'Registrar nuevo usuario',          icon: 'fa-user-plus',       route: '/synthax-pos/usuario/registrar',       keywords: ['nuevo usuario','crear usuario','registrar usuario'] },
  { label: 'Restaurantes',     sub: 'Administrar restaurantes',         icon: 'fa-store',           route: '/synthax-pos/restaurante/registrar',   keywords: ['restaurante','restaurantes','sucursal','local','sede'] },
  { label: 'Marca / Branding', sub: 'Colores y logo del restaurante',   icon: 'fa-palette',         route: '/synthax-pos/restaurante/branding',    keywords: ['branding','marca','logo','colores','identidad','tema restaurante'] },
  { label: 'Departamentos',    sub: 'Lista de departamentos',           icon: 'fa-map',             route: '/synthax-pos/departamento/registrar',  keywords: ['departamento','departamentos','región'] },
  { label: 'Municipios',       sub: 'Lista de municipios',              icon: 'fa-city',            route: '/synthax-pos/municipio/registrar',     keywords: ['municipio','municipios','ciudad','localidad'] },
  { label: 'Impuestos',        sub: 'Configuración de impuestos',       icon: 'fa-percent',         route: '/synthax-pos/impuesto/registrar',      keywords: ['impuesto','impuestos','iva','tax','tributario'] },
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
  readonly themeService     = inject(ThemeService);
  private readonly router   = inject(Router);
  private readonly auth     = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly toast    = inject(ToastService);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  isMenuOpen = false;
  isDesktop  = window.innerWidth >= 768;

  // ── Search ─────────────────────────────────────────────────────────────────
  searchTerm         = '';
  showSearchDropdown = false;

  get searchResults(): SearchItem[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.sub.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    ).slice(0, 6);
  }

  onSearchInput(): void {
    this.showSearchDropdown = this.searchTerm.trim().length > 0;
    this.showSettingsPanel  = false;
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
    this.searchTerm         = '';
    this.showSearchDropdown = false;
  }

  // ── Perfil / Settings panel ────────────────────────────────────────────────
  showSettingsPanel = false;

  // Campos del panel de perfil
  perfilNombre          = '';
  perfilApellido        = '';
  perfilTelefono        = '';
  perfilEmail           = '';
  perfilPasswordActual  = '';
  perfilPasswordNueva   = '';
  perfilPasswordConfirm = '';
  perfilFotoBase64: string | null = null;
  guardandoPerfil = false;

  // Visibilidad de contraseñas
  verPasswordActual  = false;
  verPasswordNueva   = false;
  verPasswordConfirm = false;

  @ViewChild('perfilFotoInput') perfilFotoInput!: ElementRef<HTMLInputElement>;

  toggleSettings(event: Event): void {
    event.stopPropagation();
    this.showSettingsPanel  = !this.showSettingsPanel;
    this.showSearchDropdown = false;

    if (this.showSettingsPanel) {
      this.cargarDatosPerfil();
    }
  }

  private cargarDatosPerfil(): void {
    const u = this.auth.getCurrentUser();
    if (!u) return;
    this.perfilNombre          = u.nombre   ?? '';
    this.perfilApellido        = u.apellido  ?? '';
    this.perfilTelefono        = u.telefono  ?? '';
    this.perfilEmail           = u.email     ?? '';
    this.perfilFotoBase64      = u.fotoPerfil ?? null;
    this.perfilPasswordActual  = '';
    this.perfilPasswordNueva   = '';
    this.perfilPasswordConfirm = '';
    this.verPasswordActual     = false;
    this.verPasswordNueva      = false;
    this.verPasswordConfirm    = false;
  }

  triggerPerfilFotoInput(): void {
    this.perfilFotoInput?.nativeElement.click();
  }

  onPerfilFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('La imagen no debe superar 2 MB');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => { this.perfilFotoBase64 = reader.result as string; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  quitarPerfilFoto(): void {
    this.perfilFotoBase64 = '';   // cadena vacía = quitar foto al guardar
  }

  guardarPerfil(): void {
    if (!this.perfilPasswordActual.trim()) {
      this.toast.error('Ingresa tu contraseña actual para guardar los cambios');
      return;
    }
    if (this.perfilPasswordNueva && this.perfilPasswordNueva !== this.perfilPasswordConfirm) {
      this.toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    if (this.perfilPasswordNueva && this.perfilPasswordNueva.length < 6) {
      this.toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    const userId = this.auth.getUserId();
    if (!userId) return;

    const u = this.auth.getCurrentUser();
    const payload: any = {
      nombre:    this.perfilNombre.trim(),
      apellido:  this.perfilApellido.trim(),
      email:     this.perfilEmail.trim(),
      cedula:    u?.cedula  ?? '',
      rol:       u?.rol     ?? '',
      activo:    u?.activo  ?? true,
      telefono:  this.perfilTelefono.trim() || undefined,
      password:  this.perfilPasswordNueva.trim() || this.perfilPasswordActual.trim(),
      // null = no cambiar foto; '' = quitar; 'data:...' = nueva
      ...(this.perfilFotoBase64 !== null ? { fotoPerfil: this.perfilFotoBase64 } : {}),
    };

    this.guardandoPerfil = true;
    this.usuarioService.actualizar(userId, payload).subscribe({
      next: () => {
        // Actualizar sesión local para reflejar cambios sin re-login
        this.auth.actualizarUsuarioEnSesion({
          nombre:     this.perfilNombre.trim(),
          apellido:   this.perfilApellido.trim(),
          fotoPerfil: this.perfilFotoBase64 ?? undefined,
        });
        this.toast.success('Perfil actualizado correctamente');
        this.guardandoPerfil = false;
        // Limpiar campos de contraseña por seguridad
        this.perfilPasswordActual  = '';
        this.perfilPasswordNueva   = '';
        this.perfilPasswordConfirm = '';
      },
      error: (err) => {
        this.toast.error('Error: ' + (err.error?.error ?? 'No se pudo actualizar el perfil'));
        this.guardandoPerfil = false;
      },
    });
  }

  get perfilFotoVisible(): string | null {
    if (this.perfilFotoBase64 === '') return null;   // quitar foto
    return this.perfilFotoBase64;                     // null (sin foto) o 'data:...'
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.isMenuOpen = this.isDesktop;
  }

  ngOnDestroy(): void {}

  // ── Host listeners ─────────────────────────────────────────────────────────
  @HostListener('window:resize')
  onResize(): void {
    this.isDesktop  = window.innerWidth >= 768;
    this.isMenuOpen = this.isDesktop;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showSearchDropdown = false;
    this.showSettingsPanel  = false;
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
