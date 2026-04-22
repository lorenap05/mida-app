import type { MonthlyData } from "@/lib/userStore";

/**
 * Maps M1..M12 to real month labels based on current date.
 * M12 = last full month ended, M11 = month before that, etc.
 */
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const getMonthLabel = (mKey: string): string => {
  const idx = parseInt(mKey.replace("M", ""), 10); // 1..12
  const now = new Date();
  const monthOffset = idx - 13; // M12 -> -1, M1 -> -12
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
};

export const getForecastMonthLabel = (): string => {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear().toString().slice(-2)}`;
};

/**
 * Fits a simple linear regression (OLS) to a series of values.
 * x = month index (1..12), y = the value for that month.
 * Returns the predicted value at x = 13 (next month).
 *
 * Formula:
 *   slope (b) = (n·Σxy - Σx·Σy) / (n·Σx² - (Σx)²)
 *   intercept (a) = (Σy - b·Σx) / n
 *   prediction = a + b * 13
 */
const linearRegressionForecast = (values: number[]): number => {
  const n = values.length; // 12
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1; // month index 1..12
    const y = values[i];
    sumX  += x;
    sumY  += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const predicted = intercept + slope * 13; // predict month 13

  // Never return a negative forecast value
  return Math.max(0, Math.round(predicted));
};

/**
 * Compute forecast for month 13 using linear regression on each category.
 * This projects the trend forward rather than using a flat average,
 * which is more accurate for freelancers with growing or declining income.
 */
export const computeForecast = (data: MonthlyData[]): MonthlyData => {
  const project = (key: keyof MonthlyData) =>
    linearRegressionForecast(data.map((d) => d[key] as number));

  return {
    month: "M13",
    income:    project("income"),
    rent:      project("rent"),
    groceries: project("groceries"),
    transport: project("transport"),
    leisure:   project("leisure"),
    utilities: project("utilities"),
    health:    project("health"),
    education: project("education"),
    others:    project("others"),
  };
};