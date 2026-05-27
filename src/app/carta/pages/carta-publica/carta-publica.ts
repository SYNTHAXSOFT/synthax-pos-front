import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { API_ENDPOINTS } from '../../../utils/constantes-utils';

export interface ProductoCartaItem {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string | null;
}

export interface CategoriaCartaItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  productos: ProductoCartaItem[];
}

export interface CartaData {
  restauranteId: number;
  nombre: string;
  descripcion: string | null;
  logo: string | null;
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  colorFondo: string;
  telefono: string | null;
  correo: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  tiktok: string | null;
  sitioWeb: string | null;
  categorias: CategoriaCartaItem[];
}

@Component({
  selector: 'app-carta-publica',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carta-publica.html',
  styleUrls: ['./carta-publica.css'],
})
export class CartaPublicaComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly http   = inject(HttpClient);

  public carta: CartaData | null = null;
  public cargando = true;
  public error: string | null = null;
  public categoriaActiva: number | null = null;
  public readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) { this.error = 'URL inválida'; this.cargando = false; return; }

    this.http.get<CartaData>(`${environment.URL}/${API_ENDPOINTS.CARTA}/${slug}`)
      .subscribe({
        next: (data) => {
          this.carta = data;
          this.cargando = false;
          this.categoriaActiva = data.categorias[0]?.id ?? null;
          // Aplicar colores del restaurante al documento
          this.aplicarColores(data);
        },
        error: (err) => {
          this.error = err.status === 404
            ? 'No encontramos la carta de este restaurante.'
            : 'Error al cargar la carta. Intenta de nuevo.';
          this.cargando = false;
        },
      });
  }

  seleccionarCategoria(id: number): void {
    this.categoriaActiva = id;
  }

  get categoriaActualProductos(): ProductoCartaItem[] {
    if (!this.carta || this.categoriaActiva === null) return [];
    return this.carta.categorias.find(c => c.id === this.categoriaActiva)?.productos ?? [];
  }

  /** Construye la URL de WhatsApp con mensaje opcional */
  whatsappUrl(numero: string): string {
    const limpio = numero.replace(/\D/g, '');
    return `https://wa.me/${limpio}`;
  }

  /** Normaliza URL: agrega https:// si no tiene protocolo */
  normalizeUrl(url: string): string {
    if (!url) return '#';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  formatPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(precio);
  }

  private aplicarColores(data: CartaData): void {
    const root = document.documentElement;
    root.style.setProperty('--carta-primary',    data.colorPrimario   ?? '#343a40');
    root.style.setProperty('--carta-secondary',  data.colorSecundario ?? '#6c757d');
    root.style.setProperty('--carta-text',       data.colorTexto      ?? '#ffffff');
    root.style.setProperty('--carta-bg',         data.colorFondo      ?? '#f8f9fa');
  }
}
