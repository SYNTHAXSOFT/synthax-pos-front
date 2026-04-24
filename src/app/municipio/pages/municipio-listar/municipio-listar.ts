import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MunicipioService } from '../../service/municipio.service';
import { Municipio } from '../../interfaces/municipio.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-listar-municipio-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './municipio-listar.html',
  styleUrls: ['../../../shared/styles/spx-geo.css'],
})
export class ListarMunicipioPageComponent implements OnInit {

  private municipioService        = inject(MunicipioService);
  private readonly toastService   = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  @Input()  modoModal:      boolean = false;
  @Output() nuevoMunicipio  = new EventEmitter<void>();
  @Output() editarMunicipio = new EventEmitter<number>();

  public municipios: Municipio[] = [];
  public cargando: boolean = false;
  public searchTerm: string = '';

  get municipiosFiltrados(): Municipio[] {
    if (!this.searchTerm.trim()) return this.municipios;
    const q = this.searchTerm.toLowerCase();
    return this.municipios.filter(m =>
      m.nombre?.toLowerCase().includes(q) ||
      String(m.id).includes(q) ||
      m.departamento?.nombre?.toLowerCase().includes(q)
    );
  }

  get totalActivos(): number   { return this.municipios.filter(m => m.activo).length; }
  get totalInactivos(): number { return this.municipios.filter(m => !m.activo).length; }

  ngOnInit(): void {
    this.cargarMunicipios();
  }

  cargarMunicipios(): void {
    this.cargando = true;
    // El panel admin usa /todos para ver activos e inactivos y poder gestionarlos
    this.municipioService.obtenerTodosAdmin().subscribe({
      next: (data) => {
        this.municipios = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar municipios:', error);
        this.cargando = false;
      }
    });
  }

  async eliminar(id: number): Promise<void> {
    const ok = await this.confirmService.confirm({ message: '¿Está seguro de eliminar este municipio?', type: 'danger' });
    if (!ok) return;
    this.municipioService.eliminar(id.toString()).subscribe({
      next: () => {
        this.toastService.success('Municipio eliminado');
        this.cargarMunicipios();
      },
      error: (error) => {
        console.error('Error:', error);
        this.toastService.error('Error al eliminar');
      }
    });
  }

  desactivar(id: number): void {
    this.municipioService.desactivar(id.toString()).subscribe({
      next: () => {
        this.toastService.success('Municipio desactivado');
        this.cargarMunicipios();
      },
      error: () => this.toastService.error('Error al desactivar'),
    });
  }

  editar(id: number): void {
    this.editarMunicipio.emit(id);
  }
}
