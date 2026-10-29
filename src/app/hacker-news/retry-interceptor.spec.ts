import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { REQUEST_TIMEOUT_MS, RETRY_BASE_DELAY_MS, retryInterceptor } from './retry-interceptor';

const URL = '/api/thing';
const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

describe('retryInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('retries a server error and returns the later success', () => {
    let body: unknown;
    http.get(URL).subscribe((value) => (body = value));

    backend.expectOne(URL).flush('busy', { status: 503, statusText: 'Unavailable' });
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS);
    backend.expectOne(URL).flush({ ok: true });

    expect(body).toEqual({ ok: true });
  });

  it('waits longer before each retry and gives up after two', () => {
    let error: HttpErrorResponse | undefined;
    http.get(URL).subscribe({ error: (e) => (error = e) });

    backend.expectOne(URL).flush('down', SERVER_ERROR);
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS);
    backend.expectOne(URL).flush('down', SERVER_ERROR);

    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS);
    backend.expectNone(URL); // the second retry waits twice as long
    vi.advanceTimersByTime(RETRY_BASE_DELAY_MS);
    backend.expectOne(URL).flush('down', SERVER_ERROR);

    expect(error?.status).toBe(500);
  });

  it('retries a request that takes too long', () => {
    let body: unknown;
    http.get(URL).subscribe((value) => (body = value));

    const slow = backend.expectOne(URL);
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS + RETRY_BASE_DELAY_MS);

    expect(slow.cancelled).toBe(true);
    backend.expectOne(URL).flush({ ok: true });
    expect(body).toEqual({ ok: true });
  });

  it('does not retry a client error such as a 404', () => {
    let error: HttpErrorResponse | undefined;
    http.get(URL).subscribe({ error: (e) => (error = e) });

    backend.expectOne(URL).flush('missing', { status: 404, statusText: 'Not Found' });
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    backend.expectNone(URL);
    expect(error?.status).toBe(404);
  });

  it('leaves requests other than GET alone', () => {
    let error: HttpErrorResponse | undefined;
    http.post(URL, {}).subscribe({ error: (e) => (error = e) });

    backend.expectOne(URL).flush('down', SERVER_ERROR);
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    backend.expectNone(URL);
    expect(error?.status).toBe(500);
  });
});
