import { Component, computed, input } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HnItem } from '../../hacker-news/hn-item';
import { DomainPipe } from '../../shared/domain-pipe';
import { TimeAgoPipe } from '../../shared/time-ago-pipe';

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

@Component({
  selector: 'app-story-row',
  imports: [DomainPipe, TimeAgoPipe],
  templateUrl: './story-row.html',
  styleUrl: './story-row.scss',
})
export class StoryRow {
  readonly story = input.required<HnItem>();
  readonly rank = input.required<number>();

  protected readonly discussionUrl = computed(
    () => `${environment.hackerNewsSiteUrl}/item?id=${this.story().id}`,
  );
  // Text posts such as Ask HN have no url, so their title opens the discussion instead.
  protected readonly link = computed(() => this.story().url ?? this.discussionUrl());
  protected readonly postedAt = computed(() => new Date(this.story().time * 1000).toISOString());
  // Shown when hovering over "3 hours ago".
  protected readonly postedAtLabel = computed(() => dateFormat.format(this.story().time * 1000));
  protected readonly isJob = computed(() => this.story().type === 'job');
  protected readonly points = computed(() => countLabel(this.story().score ?? 0, 'point'));
  protected readonly comments = computed(() => {
    const count = this.story().descendants ?? 0;
    return count === 0 ? 'discuss' : countLabel(count, 'comment');
  });
}

function countLabel(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
