import { Routes } from '@angular/router';

const feedPage = () => import('./feed/feed-page/feed-page').then((m) => m.FeedPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'top' },
  { path: 'top', title: 'Top stories · HN Reader', data: { feed: 'top' }, loadComponent: feedPage },
  { path: 'new', title: 'New stories · HN Reader', data: { feed: 'new' }, loadComponent: feedPage },
  { path: '**', redirectTo: 'top' },
];
