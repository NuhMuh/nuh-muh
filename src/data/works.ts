export type WorkColor = 'warm' | 'deep' | 'cold' | 'rust' | 'mossy' | 'ash';

export interface Work {
  id: string;
  number: string;
  title: string;
  tag: string;
  color: WorkColor;
  status?: string;
  articleCount: number;
  excerpt?: string;
  kicker?: string;
  isComing?: boolean;
}
