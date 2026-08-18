import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let title = 'Erro de Comunicação';
      let message = 'Ocorreu uma falha ao processar a requisição.';
      const correlationId = error.headers.get('X-Correlation-ID') || req.headers.get('X-Correlation-ID') || undefined;

      if (error.error) {
        if (typeof error.error === 'string') {
          message = error.error;
        } else if (error.error.title || error.error.detail) {
          // RFC 7807 ProblemDetails / ValidationProblemDetails
          title = error.error.title || 'Falha na Validação';
          message = error.error.detail || error.error.title;

          if (error.error.errors && typeof error.error.errors === 'object') {
            const validationMessages = Object.entries(error.error.errors)
              .map(([key, msgs]) => Array.isArray(msgs) ? `${key}: ${msgs.join(', ')}` : `${key}: ${msgs}`)
              .join(' | ');
            if (validationMessages) {
              message = `${message} (${validationMessages})`;
            }
          }
        } else if (error.error.error && typeof error.error.error === 'object') {
          title = error.error.error.code || 'Erro de Operação';
          message = error.error.error.message || message;
        } else if (error.error.message) {
          message = error.error.message;
        }
      }

      if (error.status === 0) {
        title = 'Serviço Indisponível';
        message = 'Não foi possível conectar ao API Gateway. Verifique sua conexão ou status dos containers.';
      } else if (error.status === 400) {
        title = title === 'Erro de Comunicação' ? 'Requisição Inválida (400)' : title;
      } else if (error.status === 404) {
        title = 'Recurso Não Encontrado (404)';
      } else if (error.status === 500) {
        title = 'Erro Interno do Servidor (500)';
      }

      toastService.error(title, message, correlationId);
      return throwError(() => error);
    })
  );
};
