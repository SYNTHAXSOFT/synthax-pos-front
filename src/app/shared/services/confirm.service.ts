import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly visible = signal(false);
  readonly options = signal<ConfirmOptions>({ message: '' });

  private _resolve?: (value: boolean) => void;

  confirm(options: ConfirmOptions | string): Promise<boolean> {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    this.options.set({ type: 'danger', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', ...opts });
    this.visible.set(true);
    return new Promise(resolve => { this._resolve = resolve; });
  }

  accept() { this.visible.set(false); this._resolve?.(true);  }
  cancel() { this.visible.set(false); this._resolve?.(false); }
}
