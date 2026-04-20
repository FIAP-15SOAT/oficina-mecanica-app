export function calculateTotalPages(totalRecords: number, pageSize: number): number {
  return Math.ceil(totalRecords / pageSize);
}
