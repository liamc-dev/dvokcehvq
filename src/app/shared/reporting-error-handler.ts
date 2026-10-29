import { ErrorHandler, inject, Service } from '@angular/core';
import { ErrorReporter } from './error-reporter';

/**
 * Replaces Angular's default ErrorHandler, which only logs to the console, so errors nothing else
 * caught (a bug in an event handler, for example) are reported too.
 */
@Service({ autoProvided: false })
export class ReportingErrorHandler implements ErrorHandler {
  private readonly reporter = inject(ErrorReporter);

  handleError(error: unknown): void {
    this.reporter.report('uncaught', error);
  }
}
