import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorReport, ErrorReporter } from './error-reporter';

describe('ErrorReporter', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Reports go to the console for now, so that's where the tests read them from. */
  function captureReports() {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    return {
      count: () => consoleError.mock.calls.length,
      last: () => consoleError.mock.lastCall![1] as ErrorReport,
    };
  }

  it('records where the error happened, what it was and when', () => {
    const reports = captureReports();

    TestBed.inject(ErrorReporter).report('feed-page', new Error('Something broke'), {
      feed: 'top',
    });

    expect(reports.last()).toMatchObject({
      source: 'feed-page',
      message: 'Something broke',
      details: { feed: 'top' },
    });
    expect(reports.last().time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof reports.last().page).toBe('string');
  });

  it('adds the status and address of a failed request', () => {
    const reports = captureReports();
    const error = new HttpErrorResponse({ status: 503, url: 'https://example.com/x.json' });

    TestBed.inject(ErrorReporter).report('http', error);

    expect(reports.last().details).toEqual({ status: 503, url: 'https://example.com/x.json' });
  });

  it('reports an error only once, however many places catch it', () => {
    const reports = captureReports();
    const reporter = TestBed.inject(ErrorReporter);
    const error = new Error('caught twice');

    reporter.report('http', error);
    reporter.report('feed-page', error);

    expect(reports.count()).toBe(1);
  });

  it('copes with errors that are not Error objects', () => {
    const reports = captureReports();

    TestBed.inject(ErrorReporter).report('uncaught', 'just a string');

    expect(reports.last().message).toBe('just a string');
  });
});
