import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, inject, Service } from '@angular/core';

export interface ErrorReport {
  /** Where the error was caught, e.g. 'http', 'feed-page' or 'uncaught'. */
  source: string;
  message: string;
  /** The page the visitor was on. */
  page: string;
  time: string;
  details: Record<string, unknown>;
}

/**
 * The one place errors are reported, so nothing fails silently. Each error is recorded once, with
 * enough context to investigate it. For now the record goes to the console, and this is where a
 * monitoring service such as Sentry or Datadog would be plugged in.
 */
@Service()
export class ErrorReporter {
  private readonly location = inject(DOCUMENT).location;
  // The same error can be caught twice, first by the HTTP layer and then by the page using it.
  private readonly reported = new WeakSet<object>();

  report(source: string, error: unknown, details: Record<string, unknown> = {}): void {
    if (typeof error === 'object' && error !== null) {
      if (this.reported.has(error)) {
        return;
      }
      this.reported.add(error);
    }
    const report: ErrorReport = {
      source,
      message:
        error instanceof Error || error instanceof HttpErrorResponse
          ? error.message
          : String(error),
      page: this.location.pathname + this.location.search,
      time: new Date().toISOString(),
      details: { ...httpDetails(error), ...details },
    };
    console.error('[error report]', report, error);
  }
}

function httpDetails(error: unknown): Record<string, unknown> {
  return error instanceof HttpErrorResponse ? { status: error.status, url: error.url } : {};
}
