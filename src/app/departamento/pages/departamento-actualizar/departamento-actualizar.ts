import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartamentoService } from '../../services/departamento.service';
import { Departamento } from '../../interfaces/departamento.interface';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-actualizar-departamento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departamento-actualizar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class ActualizarDepartamentoPageComponent implements OnInit {

  departamentos: any[] = [];
  municipios: any[] = [];
  zonas: any[] = [];
  puestos: any[] = [];

  selectedDepartamento = '';
  selectedMunicipio = '';
  selectedZona = '';

  departamento: Departamento = {
    id: '',
    nombre: '',
    activo: true
  };

  cargando = true;
  departamentoId = '';
  private readonly toastService = inject(ToastService);

  constructor(
    private departamentoService: DepartamentoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.departamentoId = this.route.snapshot.paramMap.get('id') || '';
    this.cargarDepartamentos();
  }

  cargarDepartamentos() {
    this.departamentoService.obtenerPorId(this.departamentoId).subscribe({
      next: (data) => {
        this.departamento = data;
        this.cargando = false;
      },
      error: (error) => {
        this.toastService.error('Error al cargar el departamento');
        this.router.navigate(['/departamentos/listar']);
      }
    });
  }

  actualizarDepartamento() {
    if (!this.departamento.nombre || !this.departamento.id) {
      this.toastService.warning('Debe completar todos los campos');
      return;
    }

    this.departamentoService.actualizar(this.departamentoId, this.departamento).subscribe({
      next: () => {
        this.toastService.success('Departamento actualizado exitosamente');
        this.router.navigate(['/departamentos/registrar']);
      },
      error: (err) => {
        this.toastService.error('Error al actualizar la departamento');
      }
    });
  }

  cancelar() {
    this.router.navigate(['/departamentos/registrar']);
  }
}