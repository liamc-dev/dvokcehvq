import { Pipe, PipeTransform } from '@angular/core';

/** Shows just the site a link points to: "https://www.github.com/x" becomes "github.com". */
@Pipe({ name: 'domain' })
export class DomainPipe implements PipeTransform {
  transform(url: string | undefined): string {
    if (!url) {
      return '';
    }
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
}
