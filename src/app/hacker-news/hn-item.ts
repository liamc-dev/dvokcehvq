export interface HnItem {
  id: number;
  type: 'story' | 'job' | 'comment' | 'poll' | 'pollopt';
  time: number;
  by?: string;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  deleted?: boolean;
  dead?: boolean;
}
