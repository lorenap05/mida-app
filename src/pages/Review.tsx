import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pencil, Check } from "lucide-react";
import MidaLogo from "@/assets/Mida_logo.svg";
import { saveUserData } from "@/lib/userStore";
import type { MonthlyData } from "@/lib/userStore";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const SEX_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];
const CHILDREN_OPTIONS = ["0", "1", "2", "3+"];
const EDUCATION_OPTIONS = ["High School", "Bachelor's", "Master's", "PhD"];

const CATEGORIES: (keyof MonthlyData)[] = [
  "income", "rent", "groceries", "transport", "leisure",
  "utilities", "health", "education", "others",
];

const CATEGORY_LABELS: Record<string, string> = {
  income: "Avg Monthly Income",
  rent: "Avg Rent",
  groceries: "Avg Groceries",
  transport: "Avg Transport",
  leisure: "Avg Leisure",
  utilities: "Avg Utilities",
  health: "Avg Health",
  education: "Avg Education",
  others: "Avg Others",
};

const computeAverages = (financialData: MonthlyData[] | undefined) => {
  if (!financialData || financialData.length === 0) return null;
  return Object.fromEntries(
    CATEGORIES.map((key) => [
      key,
      Math.round(financialData.reduce((s, m) => s + (m[key] as number), 0) / financialData.length),
    ])
  ) as Record<string, number>;
};

const Review = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;

  const [editingSection, setEditingSection] = useState<"personal" | null>(null);

  const [personalInfo, setPersonalInfo] = useState<Record<string, string>>({
    Name: state?.userData?.name || "User",
    Age: state?.userData?.age || "",
    Sex: state?.userData?.sex || "",
    "Marital Status": state?.userData?.marital || "",
    Children: state?.userData?.children || "",
    Education: state?.userData?.education || "",
    Occupation: state?.userData?.occupation || "",
  });

  const financialAverages = computeAverages(state?.userData?.financialData);

  const handleSavePersonal = () => {
    setEditingSection(null);
    saveUserData({
      name: personalInfo.Name,
      age: personalInfo.Age,
      sex: personalInfo.Sex,
      marital: personalInfo["Marital Status"],
      children: personalInfo.Children,
      education: personalInfo.Education,
      occupation: personalInfo.Occupation,
    });
  };

  const handleNext = () => {
    saveUserData({
      name: personalInfo.Name,
      age: personalInfo.Age,
      sex: personalInfo.Sex,
      marital: personalInfo["Marital Status"],
      children: personalInfo.Children,
      education: personalInfo.Education,
      occupation: personalInfo.Occupation,
    });
    navigate("/forecast");
  };

  const getSelectOptions = (key: string): string[] | null => {
    if (key === "Sex") return SEX_OPTIONS;
    if (key === "Marital Status") return MARITAL_OPTIONS;
    if (key === "Children") return CHILDREN_OPTIONS;
    if (key === "Education") return EDUCATION_OPTIONS;
    return null;
  };

  const renderPersonalField = (key: string, value: string) => {
    const options = getSelectOptions(key);
    if (options) {
      return (
        <Select value={value} onValueChange={(v) => setPersonalInfo((p) => ({ ...p, [key]: v }))}>
          <SelectTrigger className="h-8 text-sm mt-1">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        value={value}
        onChange={(e) => setPersonalInfo((p) => ({ ...p, [key]: e.target.value }))}
        className="h-8 text-sm mt-1"
        inputMode={key === "Age" ? "numeric" : "text"}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <img src={MidaLogo} alt="Mida" className="h-8 w-auto" />
          <h1 className="text-xl font-bold text-foreground">Review Your Information</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Please confirm the details below before we generate your forecast.
        </p>

        {/* Personal information — editable */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
            <button
              onClick={() => editingSection === "personal" ? handleSavePersonal() : setEditingSection("personal")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {editingSection === "personal" ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(personalInfo)
              .filter(([, v]) => editingSection === "personal" || v)
              .map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{key}</p>
                  {editingSection === "personal"
                    ? renderPersonalField(key, value)
                    : <p className="text-sm font-medium text-foreground">{value}</p>}
                </div>
              ))}
          </div>
        </Card>

        {/* Financial data summary — read-only from spreadsheet */}
        {financialAverages && (
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Financial Data</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly averages from your uploaded data · 12 months
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((key) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[key]}</p>
                  <p className={`text-sm font-medium ${key === "income" ? "text-primary" : "text-foreground"}`}>
                    ${financialAverages[key].toLocaleString("en-US")}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              To update this data, re-upload your spreadsheet via Chat.
            </p>
          </Card>
        )}

        <Button variant="hero" size="lg" className="w-full" onClick={handleNext}>
          Generate My Forecast
        </Button>
      </div>
    </div>
  );
};

export default Review;
