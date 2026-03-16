import { Router } from '@angular/router';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartamentoService } from '../../services/departamento.service';
import { Departamento } from '../../interfaces/departamento.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';

@Component({
  selector: 'app-listar-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departamento-listar.html',
  styleUrls: ['../../../shared/styles/spx-geo.css'],
})
export class ListarPageComponent implements OnInit {

  private departamentoService = inject(DepartamentoService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  public departamentos: Departamento[] = [];
  public cargando: boolean = false;
  public searchTerm: string = '';

  constructor(private router: Router) {}

  get departamentosFiltrados(): Departamento[] {
    if (!this.searchTerm.trim()) return this.departamentos;
    const q = this.searchTerm.toLowerCase();
    return this.departamentos.filter(d =>
      d.nombre?.toLowerCase().includes(q) ||
      String(d.id).includes(q)
    );
  }

  get totalActivos(): number   { return this.departamentos.filter(d => d.activo).length; }
  get totalInactivos(): number { return this.departamentos.filter(d => !d.activo).length; }

  ngOnInit(): void {
    this.cargarDepartamentos();
  }

  cargarDepartamentos(): void {
    this.cargando = true;
    this.departamentoService.obtenerTodos().subscribe({
      next: (data) => {
        this.departamentos = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
        this.cargando = false;
      }
    });
  }

  async eliminar(id?: string): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm({ message: '¿Está seguro de eliminar este departamento?', type: 'danger' });
    if (!ok) return;
    this.departamentoService.eliminar(id).subscribe({
      next: () => {
        this.toastService.success('Departamento eliminado');
        this.cargarDepartamentos();
      },
      error: (error) => {
        console.error('Error:', error);
        this.toastService.error('Error al eliminar');
      }
    });
  }

  desactivar(id?: string): void {
    if (!id) return;
    this.departamentoService.desactivar(id).subscribe({
      next: () => {
        this.toastService.success('Departamento desactivado');
        this.cargarDepartamentos();
      },
      error: (error) => {
        console.error('Error:', error);
        this.toastService.error('Error al desactivar');
      }
    });
  }

  editar(id: string): void {
    this.router.navigate(['/departamento/actualizar', id]);
  }
}
