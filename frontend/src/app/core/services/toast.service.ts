import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  correlationId?: string;
  timestamp: Date;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(toast: Omit<ToastMessage, 'id' | 'timestamp'>): void {
    const newToast: ToastMessage = {
      ...toast,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      duration: toast.duration ?? 6000
    };

    this.toasts.update(list => [newToast, ...list]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.remove(newToast.id);
      }, newToast.duration);
    }
  }

  success(title: string, message: string, correlationId?: string): void {
    this.show({ type: 'success', title, message, correlationId });
  }

  error(title: string, message: string, correlationId?: string): void {
    this.show({ type: 'error', title, message, correlationId, duration: 9000 });
  }

  warning(title: string, message: string, correlationId?: string): void {
    this.show({ type: 'warning', title, message, correlationId });
  }

  info(title: string, message: string, correlationId?: string): void {
    this.show({ type: 'info', title, message, correlationId });
  }

  remove(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
