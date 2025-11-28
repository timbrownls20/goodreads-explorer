export interface FilterState {
  dateStart?: string;
  dateEnd?: string;
  ratingMin?: number;
  ratingMax?: number;
  status?: string;
  shelves?: string[];
  genres?: string[];
}

export interface FilterPreset {
  label: string;
  filter: Partial<FilterState>;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { label: 'All Books', filter: {} },
  { label: 'Last 30 Days', filter: { dateStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } },
  { label: 'Last 90 Days', filter: { dateStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } },
  { label: 'Last 365 Days', filter: { dateStart: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } },
  { label: 'Current Year', filter: { dateStart: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0] } },
  { label: 'Read Only', filter: { status: 'read' } },
  { label: 'Currently Reading', filter: { status: 'currently-reading' } },
  { label: 'To-Read', filter: { status: 'to-read' } },
  { label: '5 Star Only', filter: { ratingMin: 5, ratingMax: 5 } },
  { label: '4+ Stars', filter: { ratingMin: 4 } },
];
