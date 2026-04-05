export interface Pagination<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}
