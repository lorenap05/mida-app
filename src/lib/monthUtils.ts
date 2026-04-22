/**
 * Generates an array of 12 month labels ending at last completed month.
 * Example (today = Mar 2026): ["Mar/25", "Apr/25", ..., "Jan/26", "Feb/26"]
 */
export const getMonthColumns = (): string[] => {
  const now = new Date();
  // Last completed month = current month - 1
  const labels: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = String(date.getFullYear()).slice(-2);
    labels.push(`${month}/${year}`);
  }
  return labels;
};