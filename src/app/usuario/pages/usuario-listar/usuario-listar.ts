import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Usuario } from '../../interfaces/usuario.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-listar-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-listar.html',
  styleUrls: ['./usuario-listar.css'],
})
export class ListarPage implements OnInit {

  private readonly usuarioService = inject(UsuarioService);
  private readonly authService    = inject(AuthService);
  private readonly toastService   = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router         = inject(Router);

  @Input() modoModal: boolean = false;
  @Output() nuevoUsuario  = new EventEmitter<void>();
  @Output() editarUsuario = new EventEmitter<number>();

  isLoading    = signal(false);
  isError      = signal(false);
  errorMessage = signal<string | null>(null);
  usuariosList = signal<Usuario[]>([]);
  currentUserRole = '';

  searchTerm   = '';
  filtroRol    = '';
  filtroEstado = '';

  paginaActual = 1;
  readonly porPagina = 10;

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole() ?? '';
    this.listarAction();
  }

  get usuariosFiltrados(): Usuario[] {
    const term = this.searchTerm.toLowerCase();
    return this.usuariosList().filter(u => {
      const matchSearch = !term ||
        u.nombre.toLowerCase().includes(term) ||
        u.apellido.toLowerCase().includes(term) ||
        u.cedula.toLowerCase().includes(term) ||
        (u.email ?? '').toLowerCase().includes(term);
      const matchRol    = !this.filtroRol    || u.rol === this.filtroRol;
      const matchEstado = !this.filtroEstado ||
        (this.filtroEstado === 'activo' ? u.activo === true : u.activo === false);
      return matchSearch && matchRol && matchEstado;
    });
  }

  get totalActivos(): number { return this.usuariosList().filter(u => u.activo).length; }

  get usuariosPaginados(): Usuario[] {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    return this.usuariosFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.usuariosFiltrados.length / this.porPagina));
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  irAPagina(p: number): void  { this.paginaActual = p; }
  paginaAnterior(): void      { if (this.paginaActual > 1) this.paginaActual--; }
  paginaSiguiente(): void     { if (this.paginaActual < this.totalPaginas) this.paginaActual++; }

  iniciales(u: Usuario): string {
    return `${u.nombre?.[0] ?? ''}${u.apellido?.[0] ?? ''}`.toUpperCase();
  }

  rolColorClass(rol: string): string {
    const map: Record<string, string> = {
      'ROOT':          'spx-u-badge--root',
      'PROPIETARIO':   'spx-u-badge--propietario',
      'ADMINISTRADOR': 'spx-u-badge--admin',
      'CAJERO':        'spx-u-badge--cajero',
      'MESERO':        'spx-u-badge--mesero',
      'DOMICILIARIO':  'spx-u-badge--domiciliario',
    };
    return map[rol] ?? 'spx-u-badge--other';
  }

  rolLabel(rol: string): string {
    const map: Record<string, string> = {
      'ROOT':          'Root',
      'PROPIETARIO':   'Propietario',
      'ADMINISTRADOR': 'Admin',
      'CAJERO':        'Cajero',
      'MESERO':        'Mesero',
      'DOMICILIARIO':  'Domiciliario',
    };
    return map[rol] ?? rol;
  }

  listarAction(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.isError.set(false);
    this.paginaActual = 1;

    this.usuarioService.listarUsuariosFiltrados().subscribe({
      next: (data) => { this.isLoading.set(false); this.usuariosList.set(data); },
      error: (err)  => {
        this.isLoading.set(false);
        this.isError.set(true);
        this.errorMessage.set(err.error?.error ?? 'Error al cargar usuarios');
      },
    });
  }

  puedeModificar(usuario: Usuario): boolean {
    if (this.currentUserRole === 'ROOT') return true;
    if (this.currentUserRole === 'ADMINISTRADOR') {
      return ['CAJERO', 'MESERO', 'DOMICILIARIO'].includes(usuario.rol);
    }
    return false;
  }

  editar(id: number): void {
    if (!this.modoModal) {
      this.router.navigate(['/synthax-pos/usuario/actualizar', id]);
      return;
    }
    this.editarUsuario.emit(id);
  }

  nuevoUsuarioAction(): void {
    if (!this.modoModal) {
      this.router.navigate(['/synthax-pos/usuario/registrar']);
      return;
    }
    this.nuevoUsuario.emit();
  }

  async activarInactivar(usuario: Usuario): Promise<void> {
    if (!this.puedeModificar(usuario)) {
      this.toastService.warning('No tienes permisos para modificar este usuario');
      return;
    }
    const accion = usuario.activo ? 'desactivar' : 'activar';
    const ok = await this.confirmService.confirm({ message: `¿Seguro de ${accion} este usuario?`, type: 'danger' });
    if (!ok) return;

    usuario.activo = !usuario.activo;
    this.usuarioService.activarInactivar(usuario).subscribe({
      next: () => this.listarAction(),
      error: (err) => {
        usuario.activo = !usuario.activo;
        this.toastService.error('Error: ' + (err.error?.error ?? 'Error desconocido'));
      },
    });
  }
}
