import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorReporter } from './error-reporter';
import { ReportingErrorHandler } from './reporting-error-handler';

describe('ReportingErrorHandler', () => {
  it('reports errors that nothing else caught', () => {
    TestBed.configureTestingModule({ providers: [ReportingErrorHandler] });
    const report = vi
      .spyOn(TestBed.inject(ErrorReporter), 'report')
      .mockImplementation(() => undefined);
    const error = new Error('a bug');

    TestBed.inject(ReportingErrorHandler).handleError(error);

    expect(report).toHaveBeenCalledWith('uncaught', error);
  });
});
