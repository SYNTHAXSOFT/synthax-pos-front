import { Injectable } from '@angular/core';

/**
 * BrandingService — Identidad Visual Dinámica por Restaurante
 *
 * Responsabilidades:
 *  1. Almacenar el branding del restaurante activo en localStorage.
 *  2. Aplicar los colores como CSS custom properties en tiempo real.
 *  3. Restaurar el branding al recargar la página.
 *  4. Limpiar el branding al cerrar sesión.
 *
 * Las CSS variables que sobrescribe son las definidas en styles.css:
 *   --primary-color, --primary-dark, --primary-light
 *   --secondary-color, --secondary-dark, --secondary-light
 *   --light-bg
 *
 * También expone variables propias del restaurante:
 *   --brand-logo  → URL/Base64 del logo (usada por los templates)
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {

  private readonly BRANDING_KEY = 'restaurant_branding';

  // Branding por defecto (tema verde del sistema)
  private readonly DEFAULTS: RestauranteBranding = {
    colorPrimario:   '#059669',
    colorSecundario: '#f97316',
    colorTexto:      '#ffffff',
    colorFondo:      '#f0fdf4',
    logo:            null,
    nombre:          'SYNTHAX POS',
  };

  // ── Inicialización ────────────────────────────────────────────────────────

  /**
   * Llamar en el bootstrap de la app (AppComponent) para restaurar
   * el branding del restaurante que estaba activo antes de recargar.
   */
  init(): void {
    const saved = this.getBranding();
    this.applyBranding(saved);
  }

  // ── API pública ──────────────────────────────────────────────────────────

  /**
   * Aplica y persiste el branding de un restaurante.
   * Llamar justo después del login exitoso.
   */
  setBranding(branding: Partial<RestauranteBranding>): void {
    const merged: RestauranteBranding = { ...this.DEFAULTS, ...branding };
    localStorage.setItem(this.BRANDING_KEY, JSON.stringify(merged));
    this.applyBranding(merged);
  }

  /**
   * Elimina el branding personalizado y vuelve al tema por defecto.
   * Llamar al cerrar sesión (logout).
   */
  clearBranding(): void {
    localStorage.removeItem(this.BRANDING_KEY);
    this.applyBranding(this.DEFAULTS);
  }

  /** Retorna el branding activo (guardado o por defecto). */
  getBranding(): RestauranteBranding {
    const raw = localStorage.getItem(this.BRANDING_KEY);
    if (!raw) return { ...this.DEFAULTS };
    try {
      return { ...this.DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...this.DEFAULTS };
    }
  }

  /** Retorna solo el logo activo (Base64, URL o null). */
  getLogo(): string | null {
    return this.getBranding().logo;
  }

  /** Retorna el nombre del restaurante activo. */
  getNombreRestaurante(): string {
    return this.getBranding().nombre ?? 'SYNTHAX POS';
  }

  // ── Aplicación de CSS variables ──────────────────────────────────────────

  /**
   * Escribe las CSS custom properties en el elemento :root del DOM.
   * Esto afecta inmediatamente todos los estilos que usen esas variables.
   */
  private applyBranding(b: RestauranteBranding): void {
    const root = document.documentElement;

    // Colores principales (sobrescriben la paleta verde por defecto)
    root.style.setProperty('--primary-color',      b.colorPrimario);
    root.style.setProperty('--primary-dark',       this.darken(b.colorPrimario, 15));
    root.style.setProperty('--primary-light',      this.lighten(b.colorPrimario, 15));

    // Color secundario / acento
    root.style.setProperty('--secondary-color',    b.colorSecundario);
    root.style.setProperty('--secondary-dark',     this.darken(b.colorSecundario, 15));
    root.style.setProperty('--secondary-light',    this.lighten(b.colorSecundario, 10));

    // Fondo general
    root.style.setProperty('--light-bg',           b.colorFondo);

    // Variables propias del branding del restaurante
    root.style.setProperty('--brand-primary',      b.colorPrimario);
    root.style.setProperty('--brand-secundario',   b.colorSecundario);
    root.style.setProperty('--brand-texto',        b.colorTexto);
    root.style.setProperty('--brand-fondo',        b.colorFondo);
    root.style.setProperty('--brand-nombre',       `"${b.nombre ?? 'SYNTHAX POS'}"`);

    // Sombras actualizadas con el color primario
    const hex  = b.colorPrimario.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const bl = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty('--shadow-sm', `0 1px 2px 0 rgba(${r},${g},${bl},0.05)`);
    root.style.setProperty('--shadow-md', `0 4px 6px -1px rgba(${r},${g},${bl},0.1)`);
    root.style.setProperty('--shadow-lg', `0 10px 15px -3px rgba(${r},${g},${bl},0.1)`);
    root.style.setProperty('--shadow-xl', `0 20px 25px -5px rgba(${r},${g},${bl},0.15)`);
  }

  // ── Utilidades de color ──────────────────────────────────────────────────

  /** Oscurece un color HEX en N puntos (0-100). */
  private darken(hex: string, amount: number): string {
    return this.adjustColor(hex, -amount);
  }

  /** Aclara un color HEX en N puntos (0-100). */
  private lighten(hex: string, amount: number): string {
    return this.adjustColor(hex, amount);
  }

  private adjustColor(hex: string, amount: number): string {
    try {
      const clean = hex.replace('#', '');
      if (clean.length !== 6) return hex;
      let r = parseInt(clean.substring(0, 2), 16);
      let g = parseInt(clean.substring(2, 4), 16);
      let b = parseInt(clean.substring(4, 6), 16);
      r = Math.max(0, Math.min(255, r + amount));
      g = Math.max(0, Math.min(255, g + amount));
      b = Math.max(0, Math.min(255, b + amount));
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    } catch {
      return hex;
    }
  }
}

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface RestauranteBranding {
  colorPrimario:   string;
  colorSecundario: string;
  colorTexto:      string;
  colorFondo:      string;
  logo:            string | null;
  nombre:          string | null;
}
