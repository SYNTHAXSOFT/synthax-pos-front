import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'dark' | 'light';

/**
 * ThemeService — Gestión del tema visual (oscuro / claro)
 *
 * - Persiste la preferencia en localStorage ('spx_theme')
 * - Aplica el atributo data-theme en <html> para activar los overrides CSS
 * - Expone un observable para que los componentes reaccionen al cambio
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {

  private readonly THEME_KEY = 'spx_theme';
  private readonly _theme$ = new BehaviorSubject<Theme>(this.loadTheme());

  /** Observable del tema actual */
  readonly theme$ = this._theme$.asObservable();

  /** Valor sincrónico del tema actual */
  get current(): Theme { return this._theme$.value; }

  /** true si el tema activo es oscuro */
  get isDark(): boolean { return this._theme$.value === 'dark'; }

  /**
   * Debe llamarse en el bootstrap de la app (AppComponent.ngOnInit)
   * para restaurar el tema guardado al recargar la página.
   */
  init(): void {
    this.apply(this._theme$.value);
  }

  /** Alterna entre dark y light */
  toggle(): void {
    this.setTheme(this._theme$.value === 'dark' ? 'light' : 'dark');
  }

  /** Establece un tema específico */
  setTheme(theme: Theme): void {
    this._theme$.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.apply(theme);
  }

  // ── Privado ────────────────────────────────────────────────────────────────

  private loadTheme(): Theme {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    // Detectar preferencia del sistema si no hay nada guardado
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
