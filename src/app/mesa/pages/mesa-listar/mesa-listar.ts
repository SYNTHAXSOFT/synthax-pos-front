import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MesaService } from '../../services/mesa.service';
import { Mesa } from '../../interfaces/mesa.interface';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-mesa-listar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mesa-listar.html',
  styleUrls: ['./mesa-listar.css'],
})
export class MesaListarPageComponent implements OnInit {
  private readonly mesaService    = inject(MesaService);
  private readonly authService    = inject(AuthService);
  private readonly toastService   = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  @Input() modoModal: boolean = false;
  @Output() nuevaMesa  = new EventEmitter<void>();
  @Output() editarMesa = new EventEmitter<number>();

  public mesas: Mesa[] = [];
  public cargando: boolean = false;
  public restauranteId?: number;

  searchTerm: string = '';
  filtroEstado: 'todas' | 'activa' | 'inactiva' = 'todas';

  ngOnInit(): void {
    this.restauranteId = this.authService.getRestauranteId() ?? undefined;
    this.cargarMesas();
  }

  cargarMesas(): void {
    this.cargando = true;
    this.mesaService.obtenerTodos().subscribe({
      next: (data) => { this.mesas = data; this.cargando = false; },
      error: (err) => { console.error('Error al cargar mesas:', err); this.cargando = false; },
    });
  }

  get mesasFiltradas(): Mesa[] {
    return this.mesas.filter(m => {
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !term ||
        (m.nombre?.toLowerCase().includes(term) ?? false) ||
        (m.codigo?.toLowerCase().includes(term) ?? false);
      const matchEstado =
        this.filtroEstado === 'todas'    ? true :
        this.filtroEstado === 'activa'   ? (m.activo === true) :
        this.filtroEstado === 'inactiva' ? (m.activo === false) : true;
      return matchSearch && matchEstado;
    });
  }

  get totalActivas(): number   { return this.mesas.filter(m => m.activo).length; }
  get totalInactivas(): number { return this.mesas.filter(m => !m.activo).length; }

  setFiltroEstado(f: 'todas' | 'activa' | 'inactiva'): void {
    this.filtroEstado = f;
  }

  editar(id?: number): void {
    if (!id) return;
    this.editarMesa.emit(id);
  }

  async desactivar(id?: number): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Desea desactivar esta mesa?', type: 'danger' });
    if (!ok) return;
    this.mesaService.desactivar(id).subscribe({
      next: () => { this.toastService.success('Mesa desactivada'); this.cargarMesas(); },
      error: (err) => { console.error('Error:', err); this.toastService.error('Error al desactivar la mesa'); },
    });
  }

  getMesaNumber(mesa: Mesa): string {
    const match = (mesa.nombre ?? mesa.codigo ?? '').match(/\d+/);
    return match ? match[0] : mesa.codigo?.slice(-2) ?? '?';
  }
}
