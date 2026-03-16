import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { BrandingService } from '../../../shared/services/branding.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Restaurante } from '../../interfaces/restaurante.interface';

@Component({
  selector: 'app-restaurante-branding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './restaurante-branding.html',
  styleUrls: ['./restaurante-branding.css'],
})
export class RestauranteBrandingComponent implements OnInit {

  private readonly fb                 = inject(FormBuilder);
  private readonly restauranteService = inject(RestauranteService);
  private readonly brandingService    = inject(BrandingService);
  private readonly authService        = inject(AuthService);
  private readonly route              = inject(ActivatedRoute);

  restaurante: Restaurante | null = null;
  cargando     = false;
  guardando    = false;
  exito        = false;
  logoPreview: string | null = null;

  brandingForm: FormGroup = this.fb.group({
    colorPrimario:   ['#059669'],
    colorSecundario: ['#f97316'],
    colorTexto:      ['#ffffff'],
    colorFondo:      ['#f0fdf4'],
  });

  ngOnInit(): void {
    // Obtener id del restaurante: queryParam o del usuario logueado
    this.route.queryParams.subscribe(params => {
      const idParam = params['id'];
      const restauranteId = idParam
        ? +idParam
        : this.authService.getRestauranteId();

      if (restauranteId) {
        this.cargarRestaurante(restauranteId);
      }
    });

    // Preview en tiempo real al cambiar colores
    this.brandingForm.valueChanges.subscribe(v => this.previewBranding(v));
  }

  cargarRestaurante(id: number): void {
    this.cargando = true;
    this.restauranteService.obtenerPorId(id).subscribe({
      next: (r) => {
        this.restaurante = r;
        this.logoPreview = r.logo ?? null;
        this.brandingForm.patchValue({
          colorPrimario:   r.colorPrimario   ?? '#059669',
          colorSecundario: r.colorSecundario ?? '#f97316',
          colorTexto:      r.colorTexto      ?? '#ffffff',
          colorFondo:      r.colorFondo      ?? '#f0fdf4',
        });
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  // ── Carga de logo ─────────────────────────────────────────────────────────

  onLogoSeleccionado(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validar tipo y tamaño (máx. 2 MB)
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('El logo no debe superar 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.logoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  eliminarLogo(): void {
    this.logoPreview = null;
  }

  // ── Preview en vivo ──────────────────────────────────────────────────────

  private previewBranding(v: any): void {
    this.brandingService.setBranding({
      colorPrimario:   v.colorPrimario,
      colorSecundario: v.colorSecundario,
      colorTexto:      v.colorTexto,
      colorFondo:      v.colorFondo,
      logo:            this.logoPreview,
      nombre:          this.restaurante?.nombre ?? null,
    });
  }

  // ── Guardar ──────────────────────────────────────────────────────────────

  guardar(): void {
    if (!this.restaurante?.id) return;
    this.guardando = true;
    this.exito     = false;

    const { colorPrimario, colorSecundario, colorTexto, colorFondo } = this.brandingForm.value;

    this.restauranteService.actualizarBranding(this.restaurante.id, {
      logo:            this.logoPreview,
      colorPrimario,
      colorSecundario,
      colorTexto,
      colorFondo,
    }).subscribe({
      next: (r) => {
        this.restaurante = r;
        // Persistir branding en localStorage y aplicarlo
        this.brandingService.setBranding({
          colorPrimario,
          colorSecundario,
          colorTexto,
          colorFondo,
          logo:   this.logoPreview,
          nombre: r.nombre ?? null,
        });
        this.guardando = false;
        this.exito     = true;
        setTimeout(() => this.exito = false, 3000);
      },
      error: (err) => {
        alert('Error al guardar: ' + (err.error?.error ?? 'Error desconocido'));
        this.guardando = false;
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Contraste de texto (blanco/negro) sobre un color HEX para los swatches. */
  contrasteTexto(hex: string): string {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  }
}
