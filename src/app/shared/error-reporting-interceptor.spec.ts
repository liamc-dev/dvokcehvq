import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RETRY_BASE_DELAY_MS, retryInterceptor } from '../hacker-news/retry-interceptor';
import { ErrorReporter } from './error-reporter';
import { errorReportingInterceptor } from './error-reporting-interceptor';

const URL = '/api/thing';
const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

describe('errorReportingInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // The same order as the app: reporting wraps retrying.
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorReportingInterceptor, retryInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
      report: vi.spyOn(TestBed.inject(ErrorReporter), 'report').mockImplementation(() => undefined),
    };
  }

  it('reports a request once it has failed for good, not on every attempt', () => {
    const { http, backend, report } = setup();
    http.get(URL).subscribe({ error: () => undefined });

    backend.expectOne(URL).flush('down', SERVER_ERROR);
    expect(report).not.toHaveBeenCalled(); // a retry is still coming
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS);
    backend.expectOne(URL).flush('down', SERVER_ERROR);
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS * 2);
    backend.expectOne(URL).flush('down', SERVER_ERROR);

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith('http', expect.any(HttpErrorResponse), {
      method: 'GET',
      url: URL,
    });
  });

  it('still passes the error on to whoever made the request', () => {
    const { http, backend, report } = setup();
    let error: HttpErrorResponse | undefined;
    http.get(URL).subscribe({ error: (e) => (error = e) });

    backend.expectOne(URL).flush('missing', { status: 404, statusText: 'Not Found' });

    expect(error?.status).toBe(404);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('reports nothing when the request succeeds', () => {
    const { http, backend, report } = setup();
    http.get(URL).subscribe();

    backend.expectOne(URL).flush({ ok: true });

    expect(report).not.toHaveBeenCalled();
  });
});
