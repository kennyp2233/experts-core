export interface DaeListItem {
  raw: Record<string, string>;
}

export interface DaeListPage {
  items: DaeListItem[];
  page: number;
  hasNextPage: boolean;
  retrievedAt: string;
}
