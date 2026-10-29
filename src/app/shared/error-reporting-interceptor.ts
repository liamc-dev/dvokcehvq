import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorReporter } from './error-reporter';

/**
 * Reports every request that still fails after the retry interceptor has given up. It comes first
 * in the chain, so it only sees the final outcome, and it passes the error on unchanged.
 */
export const errorReportingInterceptor: HttpInterceptorFn = (req, next) => {
  const reporter = inject(ErrorReporter);
  return next(req).pipe(
    catchError((error: unknown) => {
      reporter.report('http', error, { method: req.method, url: req.urlWithParams });
      return throwError(() => error);
    }),
  );
};
