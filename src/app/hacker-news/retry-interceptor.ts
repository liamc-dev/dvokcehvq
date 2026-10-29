import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timeout, timer } from 'rxjs';

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 300;

/**
 * Gives every GET a timeout and retries it with a growing delay (300ms, then 600ms).
 * Only failures that can fix themselves are retried: network errors, timeouts and 5xx.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }
  return next(req).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    retry({
      count: MAX_RETRIES,
      delay: (error, attempt) =>
        isRetryable(error)
          ? timer(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
          : throwError(() => error),
    }),
  );
};

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return error.status === 0 || error.status >= 500;
  }
  return true; // a TimeoutError from the timeout above
}
