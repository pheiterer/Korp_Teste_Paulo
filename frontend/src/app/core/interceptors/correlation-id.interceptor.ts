import { HttpInterceptorFn } from '@angular/common/http';

export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  const existingCorrelationId = req.headers.get('X-Correlation-ID');
  const correlationId = existingCorrelationId || crypto.randomUUID();

  const modifiedReq = req.clone({
    headers: req.headers.set('X-Correlation-ID', correlationId)
  });

  return next(modifiedReq);
};
