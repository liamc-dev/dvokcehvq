import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { retryInterceptor } from './hacker-news/retry-interceptor';
import { errorReportingInterceptor } from './shared/error-reporting-interceptor';
import { ReportingErrorHandler } from './shared/reporting-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    // Sends errors from anywhere in the browser to the ErrorHandler below.
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // Order matters: reporting wraps retrying, so a request is reported only once it has failed
    // for good, not on every attempt.
    provideHttpClient(withInterceptors([errorReportingInterceptor, retryInterceptor])),
    // index.html loads the Material Symbols icon font, so make it the default for <mat-icon>.
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
  ],
};
