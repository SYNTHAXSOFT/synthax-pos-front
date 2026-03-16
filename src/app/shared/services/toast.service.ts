import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _counter = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, duration = 3500) { this._add('success', message, duration); }
  error(message: string, duration = 5000)   { this._add('error',   message, duration); }
  warning(message: string, duration = 4000) { this._add('warning', message, duration); }
  info(message: string, duration = 3500)    { this._add('info',    message, duration); }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private _add(type: ToastType, message: string, duration: number) {
    const id = ++this._counter;
    this.toasts.update(list => [...list, { id, type, message, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
