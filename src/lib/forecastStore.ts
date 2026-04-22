const STORAGE_KEY = "mida_forecast_adjustments";

export interface ForecastAdjustments {
  rent?: number;
  groceries?: number;
  transport?: number;
  leisure?: number;
  utilities?: number;
  health?: number;
  education?: number;
  others?: number;
}

export const saveForecastAdjustments = (adjustments: ForecastAdjustments) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(adjustments));
};

export const loadForecastAdjustments = (): ForecastAdjustments | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearForecastAdjustments = () => {
  localStorage.removeItem(STORAGE_KEY);
};
