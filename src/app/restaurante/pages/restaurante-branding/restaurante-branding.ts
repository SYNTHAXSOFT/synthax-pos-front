import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { BrandingService } from '../../../shared/services/branding.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Restaurante } from '../../interfaces/restaurante.interface';
import { ToastService } from '../../../shared/services/toast.service';

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
  private readonly toastService       = inject(ToastService);

  restaurante: Restaurante | null = null;
  cargando       = false;
  guardando      = false;
  guardandoSlug  = false;
  exito          = false;
  exitoSlug      = false;
  logoPreview: string | null = null;

  brandingForm: FormGroup = this.fb.group({
    colorPrimario:   ['#059669'],
    colorSecundario: ['#f97316'],
    colorTexto:      ['#ffffff'],
    colorFondo:      ['#f0fdf4'],
  });

  slugForm: FormGroup = this.fb.group({
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9\-]+$/)]],
  });

  redesForm: FormGroup = this.fb.group({
    instagram: [''],
    facebook:  [''],
    whatsapp:  [''],
    tiktok:    [''],
    sitioWeb:  [''],
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
        this.slugForm.patchValue({ slug: r.slug ?? '' });
        this.redesForm.patchValue({
          instagram: r.instagram ?? '',
          facebook:  r.facebook  ?? '',
          whatsapp:  r.whatsapp  ?? '',
          tiktok:    r.tiktok    ?? '',
          sitioWeb:  r.sitioWeb  ?? '',
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
      this.toastService.warning('Por favor selecciona un archivo de imagen (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toastService.warning('El logo no debe superar 2 MB.');
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
    const { instagram, facebook, whatsapp, tiktok, sitioWeb } = this.redesForm.value;

    this.restauranteService.actualizarBranding(this.restaurante.id, {
      logo:            this.logoPreview,
      colorPrimario,
      colorSecundario,
      colorTexto,
      colorFondo,
      instagram:  instagram  ?? '',
      facebook:   facebook   ?? '',
      whatsapp:   whatsapp   ?? '',
      tiktok:     tiktok     ?? '',
      sitioWeb:   sitioWeb   ?? '',
    }).subscribe({
      next: (r) => {
        this.restaurante = r;
        this.redesForm.patchValue({
          instagram: r.instagram ?? '',
          facebook:  r.facebook  ?? '',
          whatsapp:  r.whatsapp  ?? '',
          tiktok:    r.tiktok    ?? '',
          sitioWeb:  r.sitioWeb  ?? '',
        });
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
        this.toastService.error('Error al guardar: ' + (err.error?.error ?? 'Error desconocido'));
        this.guardando = false;
      },
    });
  }

  // ── Slug (Carta Digital) ─────────────────────────────────────────────────

  guardarSlug(): void {
    if (!this.restaurante?.id || this.slugForm.invalid) {
      this.slugForm.markAllAsTouched();
      return;
    }
    this.guardandoSlug = true;
    this.exitoSlug = false;
    const rawSlug: string = this.slugForm.value.slug ?? '';
    const slug = rawSlug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
    this.restauranteService.actualizarSlug(this.restaurante.id, slug).subscribe({
      next: (r) => {
        this.restaurante = r;
        this.slugForm.patchValue({ slug: r.slug ?? '' });
        this.guardandoSlug = false;
        this.exitoSlug = true;
        setTimeout(() => this.exitoSlug = false, 3000);
      },
      error: (err) => {
        this.toastService.error(err.error?.error ?? 'Error al guardar el slug');
        this.guardandoSlug = false;
      },
    });
  }

  normalizarSlug(): void {
    const val: string = this.slugForm.get('slug')?.value ?? '';
    this.slugForm.get('slug')!.setValue(val.toLowerCase().replace(/[^a-z0-9\-]/g, ''), { emitEvent: false });
  }

  get cartaUrl(): string {
    const slug = this.slugForm.value.slug ?? this.restaurante?.slug ?? '';
    return slug ? `moedpos.com/#/carta/${slug}` : '';
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
