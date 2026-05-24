import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Declara la API global de reCAPTCHA v3 que carga el script de Google
 * incluido en index.html: api.js?render=SITE_KEY
 */
declare const grecaptcha: {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

/**
 * Servicio para obtener tokens de Google reCAPTCHA v3 (invisible).
 *
 * Uso:
 *   const token = await this.recaptchaService.execute('login');
 *
 * Si reCAPTCHA no está disponible (sin conexión, bloqueado por ad-blocker),
 * retorna '' en lugar de lanzar excepción — el backend decide si bloquear
 * o permitir en ese caso.
 */
@Injectable({ providedIn: 'root' })
export class RecaptchaService {

  private readonly siteKey = environment.recaptchaSiteKey;

  /**
   * Ejecuta el desafío invisible de reCAPTCHA v3 y retorna el token.
   * @param action Nombre de la acción (ej. 'login', 'contacto'). Aparece en el panel de Google.
   */
  async execute(action: string): Promise<string> {
    try {
      return await new Promise<string>((resolve, reject) => {
        grecaptcha.ready(() => {
          grecaptcha
            .execute(this.siteKey, { action })
            .then(resolve)
            .catch(reject);
        });
      });
    } catch {
      // Fail-open: si el script no cargó (red, ad-blocker), no bloqueamos al usuario.
      // El backend registrará score=0 y podrá aplicar su propia política.
      console.warn('[reCAPTCHA] No se pudo obtener token — se enviará vacío.');
      return '';
    }
  }
}
