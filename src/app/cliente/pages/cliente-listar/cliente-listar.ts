import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { Cliente } from '../../interfaces/cliente.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

interface ClienteForm {
  nombre:   string;
  apellido: string;
  cedula:   string;
  email:    string;
  telefono: string;
}

@Component({
  selector: 'app-cliente-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-listar.html',
  styleUrls: ['./cliente-listar.css'],
})
export class ClienteListarComponent implements OnInit {

  private readonly clienteService = inject(ClienteService);
  private readonly toastService   = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  // ── State ────────────────────────────────────────────────────────────────

  cargando  = true;
  guardando = false;
  clientes: Cliente[] = [];

  // ── Filters ──────────────────────────────────────────────────────────────

  searchTerm   = '';
  filtroEstado = '';

  // ── Pagination ───────────────────────────────────────────────────────────

  paginaActual       = 1;
  readonly porPagina = 10;

  // ── Modal ────────────────────────────────────────────────────────────────

  mostrarModal = false;
  modoEditar   = false;
  editandoId: number | null = null;

  form: ClienteForm = {
    nombre:   '',
    apellido: '',
    cedula:   '',
    email:    '',
    telefono: '',
  };

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.clienteService.listar().subscribe({
      next: (data) => { this.clientes = data; this.cargando = false; },
      error: ()    => { this.cargando = false; },
    });
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  get clientesFiltrados(): Cliente[] {
    const term = this.searchTerm.toLowerCase();
    return this.clientes.filter(c => {
      const matchSearch = !term ||
        c.nombre.toLowerCase().includes(term) ||
        c.apellido.toLowerCase().includes(term) ||
        c.cedula.toLowerCase().includes(term) ||
        (c.email ?? '').toLowerCase().includes(term) ||
        (c.telefono ?? '').toLowerCase().includes(term);
      const matchEstado = !this.filtroEstado ||
        (this.filtroEstado === 'activo' ? c.activo === true : c.activo === false);
      return matchSearch && matchEstado;
    });
  }

  get clientesPaginados(): Cliente[] {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    return this.clientesFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.clientesFiltrados.length / this.porPagina));
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  get totalActivos(): number {
    return this.clientes.filter(c => c.activo).length;
  }

  // ── Pagination ───────────────────────────────────────────────────────────

  irAPagina(p: number): void  { this.paginaActual = p; }
  paginaAnterior(): void      { if (this.paginaActual > 1) this.paginaActual--; }
  paginaSiguiente(): void     { if (this.paginaActual < this.totalPaginas) this.paginaActual++; }

  // ── Helpers ──────────────────────────────────────────────────────────────

  iniciales(c: Cliente): string {
    return `${c.nombre?.[0] ?? ''}${c.apellido?.[0] ?? ''}`.toUpperCase();
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  abrirCrear(): void {
    this.modoEditar = false;
    this.editandoId = null;
    this.form = { nombre: '', apellido: '', cedula: '', email: '', telefono: '' };
    this.mostrarModal = true;
  }

  abrirEditar(c: Cliente): void {
    this.modoEditar = true;
    this.editandoId = c.id ?? null;
    this.form = {
      nombre:   c.nombre,
      apellido: c.apellido,
      cedula:   c.cedula,
      email:    c.email,
      telefono: c.telefono ?? '',
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  esFormValido(): boolean {
    return !!(
      this.form.nombre.trim() &&
      this.form.apellido.trim() &&
      this.form.cedula.trim() &&
      this.form.email.trim()
    );
  }

  guardar(): void {
    if (!this.esFormValido() || this.guardando) return;
    this.guardando = true;

    const payload: Cliente = {
      nombre:   this.form.nombre.trim(),
      apellido: this.form.apellido.trim(),
      cedula:   this.form.cedula.trim(),
      email:    this.form.email.trim(),
      telefono: this.form.telefono.trim() || undefined,
      activo:   true,
    };

    if (this.modoEditar && this.editandoId) {
      this.clienteService.actualizar(this.editandoId, payload).subscribe({
        next: () => {
          this.toastService.success('Cliente actualizado exitosamente');
          this.guardando = false;
          this.cerrarModal();
          this.cargar();
        },
        error: (err) => {
          this.toastService.error('Error: ' + (err.error?.error ?? 'Error desconocido'));
          this.guardando = false;
        },
      });
    } else {
      this.clienteService.crear(payload).subscribe({
        next: () => {
          this.toastService.success('Cliente creado exitosamente');
          this.guardando = false;
          this.cerrarModal();
          this.cargar();
        },
        error: (err) => {
          this.toastService.error('Error: ' + (err.error?.error ?? 'Error desconocido'));
          this.guardando = false;
        },
      });
    }
  }

  async desactivar(c: Cliente): Promise<void> {
    const ok = await this.confirmService.confirm({
      message: `¿Desactivar a ${c.nombre} ${c.apellido}?`,
      type: 'danger',
    });
    if (!ok) return;

    this.clienteService.desactivar(c.id!).subscribe({
      next: () => {
        this.toastService.success('Cliente desactivado');
        this.cargar();
      },
      error: (err) => {
        this.toastService.error('Error: ' + (err.error?.error ?? 'Error desconocido'));
      },
    });
  }
}
