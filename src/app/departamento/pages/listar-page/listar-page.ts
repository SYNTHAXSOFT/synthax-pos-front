import { Router } from '@angular/router';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartamentoService } from '../../services/departamento.service';
import { Departamento } from '../../interfaces/departamento.interface';

@Component({
  selector: 'app-listar-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listar-page.html'
})
export class ListarPageComponent implements OnInit {
  
  private departamentoService = inject(DepartamentoService);
  public departamentos: Departamento[] = [];
  public cargando: boolean = false;

   constructor(private router: Router) {}

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

  eliminar(id?: string): void {
  if (!id) return; // evita errores si id es undefined
  if (confirm('¿Está seguro de eliminar este departamento?')) {
    this.departamentoService.eliminar(id).subscribe({
      next: () => {
        alert('Departamento eliminado');
        this.cargarDepartamentos();
      },
      error: (error) => {
        console.error('Error:', error);
        alert('Error al eliminar');
      }
    });
  }
}

desactivar(id?: string): void {
  if (!id) return; // protege si id no existe
  this.departamentoService.desactivar(id).subscribe({
    next: () => {
      alert('Departamento desactivado');
      this.cargarDepartamentos();
    },
    error: (error) => {
      console.error('Error:', error);
      alert('Error al desactivar');
    }
  });
}

  editar(id: string): void {
    this.router.navigate(['/departamento/actualizar', id]);
  }
}