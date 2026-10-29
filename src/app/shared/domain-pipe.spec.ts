import { DomainPipe } from './domain-pipe';

describe('DomainPipe', () => {
  const pipe = new DomainPipe();

  it('shows the host name without "www."', () => {
    expect(pipe.transform('https://www.github.com/angular/angular')).toBe('github.com');
  });

  it('keeps other subdomains', () => {
    expect(pipe.transform('https://blog.example.co.uk/post')).toBe('blog.example.co.uk');
  });

  it('returns an empty string when there is no usable url', () => {
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('not a url')).toBe('');
  });
});
