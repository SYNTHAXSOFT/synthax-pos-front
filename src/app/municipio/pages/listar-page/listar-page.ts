import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MunicipioService } from '../../service/municipio.service';
import { Municipio } from '../../interfaces/municipio.interface';

@Component({
  selector: 'app-listar-municipio-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listar-page.html'
})
export class ListarMunicipioPageComponent implements OnInit {

  private municipioService = inject(MunicipioService);
  public municipios: Municipio[] = [];
  public cargando: boolean = false;

  ngOnInit(): void {
    this.cargarMunicipios();
  }

  cargarMunicipios(): void {
    this.cargando = true;
    this.municipioService.obtenerTodos().subscribe({
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

  eliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar este municipio?')) {
      this.municipioService.eliminar(id.toString()).subscribe({
        next: () => {
          alert('Municipio eliminado');
          this.cargarMunicipios();
        },
        error: (error) => {
          console.error('Error:', error);
          alert('Error al eliminar');
        }
      });
    }
  }

  desactivar(id: number): void {
    this.municipioService.desactivar(id.toString()).subscribe({
      next: () => {
        alert('Municipio desactivado');
        this.cargarMunicipios();
      },
      error: (error) => {
        console.error('Error:', error);
        alert('Error al desactivar');
      }
    });
  }
}
