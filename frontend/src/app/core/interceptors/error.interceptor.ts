import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

function formatFieldName(field: string): string {
  const clean = field.replace(/^\$\.?/, '').replace(/^request\./i, '').trim();
  const map: Record<string, string> = {
    codigo: 'Código',
    codigo_produto: 'Código do Produto',
    codigoProduto: 'Código do Produto',
    descricao: 'Descrição',
    descricao_produto: 'Descrição do Produto',
    saldo: 'Saldo',
    saldoInicial: 'Saldo Inicial',
    saldo_inicial: 'Saldo Inicial',
    quantidade: 'Quantidade',
    preco: 'Preço',
    preco_unitario: 'Preço Unitário',
    precoUnitario: 'Preço Unitário',
    itens: 'Itens'
  };
  return map[clean] || map[clean.toLowerCase()] || clean;
}

function cleanValidationMessage(field: string, rawMsg: string): string {
  if (rawMsg.includes('JSON value could not be converted') || rawMsg.includes('could not be converted to')) {
    const formatted = formatFieldName(field);
    return `O campo "${formatted}" deve conter um valor numérico inteiro válido.`;
  }
  if (rawMsg.toLowerCase().includes('is required') || rawMsg.toLowerCase().includes('field is required')) {
    const formatted = formatFieldName(field);
    return `O campo "${formatted}" é obrigatório.`;
  }
  return rawMsg;
}

export function extractErrorMessage(error: HttpErrorResponse): { title: string; message: string } {
  let title = 'Erro na Requisição';
  let message = 'Ocorreu uma falha ao processar a requisição.';

  if (error.error) {
    if (typeof error.error === 'string') {
      message = error.error;
    } else if (error.error.errors && typeof error.error.errors === 'object') {
      title = 'Erro de Validação';
      const messages: string[] = [];
      for (const [field, val] of Object.entries(error.error.errors)) {
        if (field.toLowerCase() === 'request' && Array.isArray(val) && val.some((v: string) => v.includes('field is required'))) {
          if (Object.keys(error.error.errors).length > 1) {
            continue;
          }
        }
        if (Array.isArray(val)) {
          val.forEach((msg: string) => {
            messages.push(cleanValidationMessage(field, msg));
          });
        } else if (typeof val === 'string') {
          messages.push(cleanValidationMessage(field, val));
        }
      }
      message = messages.length > 0 ? messages.join('\n') : (error.error.detail || error.error.title || message);
    } else if (error.error.detail || error.error.title) {
      if (error.error.title === 'One or more validation errors occurred.') {
        title = 'Erro de Validação';
      } else {
        title = error.error.title || 'Falha na Operação';
      }
      message = error.error.detail || error.error.title;
    } else if (error.error.error && typeof error.error.error === 'object') {
      title = error.error.error.code ? error.error.error.code.replace(/_/g, ' ') : 'Erro de Negócio';
      message = error.error.error.message || message;
    } else if (error.error.message) {
      message = error.error.message;
    }
  }

  if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
    title = 'Sistema Indisponível';
    message = 'Não foi possível se conectar ao sistema no momento. Por favor, tente novamente em instantes.';
  } else if (error.status === 400 && title === 'Erro na Requisição') {
    title = 'Dados Inválidos';
  } else if (error.status === 404) {
    title = 'Não Encontrado';
    message = message === 'Ocorreu uma falha ao processar a requisição.' ? 'O recurso solicitado não foi encontrado.' : message;
  } else if (error.status === 500) {
    title = 'Indisponibilidade Temporária';
    message = 'Ocorreu uma falha ao processar sua solicitação. Por favor, tente novamente em instantes.';
  }

  return { title, message };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const { title, message } = extractErrorMessage(error);
      const correlationId = error.headers.get('X-Correlation-ID') || req.headers.get('X-Correlation-ID') || undefined;

      toastService.error(title, message, correlationId);
      return throwError(() => error);
    })
  );
};
