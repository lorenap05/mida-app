export interface MonthlyData {
  month: string; // M1..M12
  income: number;
  rent: number;
  groceries: number;
  transport: number;
  leisure: number;
  utilities: number;
  health: number;
  education: number;
  others: number;
}

export interface UserData {
  name?: string;
  age?: string;
  employment?: string;
  sex?: string;
  marital?: string;
  children?: string;
  education?: string;
  occupation?: string;
  goals?: string;
  dataMethod?: string;
  incomeRange?: string;
  rent?: string;
  groceries?: string;
  transport?: string;
  leisure?: string;
  utilities?: string;
  health?: string;
  education_expense?: string;
  financialData?: MonthlyData[];
}

const STORAGE_KEY = "mida_user_data";

export const saveUserData = (data: UserData) => {
  const existing = loadUserData();
  const merged = { ...existing, ...data };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
};

export const loadUserData = (): UserData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const hasCompletedOnboarding = (): boolean => {
  const data = loadUserData();
  return !!data.name && !!data.occupation;
};

export const hasFinancialData = (): boolean => {
  const data = loadUserData();
  return !!data.financialData && data.financialData.length === 12;
};
