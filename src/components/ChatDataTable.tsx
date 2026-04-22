import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthLabel } from "@/lib/forecastUtils";
import type { MonthlyData } from "@/lib/userStore";

const CATEGORIES = [
  { key: "income", label: "Income" },
  { key: "rent", label: "Rent" },
  { key: "groceries", label: "Groceries" },
  { key: "transport", label: "Transport" },
  { key: "leisure", label: "Leisure" },
  { key: "utilities", label: "Utilities" },
  { key: "health", label: "Health" },
  { key: "education", label: "Education" },
  { key: "others", label: "Others" },
] as const;

interface ChatDataTableProps {
  onComplete: (data: MonthlyData[]) => void;
}

const ChatDataTable = ({ onComplete }: ChatDataTableProps) => {
  const [currentMonth, setCurrentMonth] = useState(0); // 0-11
  const [data, setData] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    for (let i = 0; i < 12; i++) {
      init[`M${i + 1}`] = {};
      CATEGORIES.forEach((c) => {
        init[`M${i + 1}`][c.key] = 0;
      });
    }
    return init;
  });

  const monthKey = `M${currentMonth + 1}`;
  const monthLabel = getMonthLabel(monthKey);

  const updateValue = (category: string, value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    setData((prev) => ({
      ...prev,
      [monthKey]: { ...prev[monthKey], [category]: num },
    }));
  };

  const handleSubmit = () => {
    const result: MonthlyData[] = Array.from({ length: 12 }, (_, i) => {
      const mk = `M${i + 1}`;
      return {
        month: mk,
        income: data[mk].income,
        rent: data[mk].rent,
        groceries: data[mk].groceries,
        transport: data[mk].transport,
        leisure: data[mk].leisure,
        utilities: data[mk].utilities,
        health: data[mk].health,
        education: data[mk].education,
        others: data[mk].others,
      };
    });
    onComplete(result);
  };

  const filledMonths = Array.from({ length: 12 }, (_, i) => {
    const mk = `M${i + 1}`;
    return CATEGORIES.some((c) => data[mk][c.key] > 0);
  });

  const allFilled = filledMonths.every(Boolean);

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-3 w-full max-w-[320px]">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={currentMonth === 0}
          onClick={() => setCurrentMonth((p) => p - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={currentMonth === 11}
          onClick={() => setCurrentMonth((p) => p + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Month dots */}
      <div className="flex justify-center gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentMonth(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentMonth
                ? "bg-primary"
                : filledMonths[i]
                ? "bg-primary/40"
                : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Category inputs */}
      <div className="space-y-2">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{cat.label}</span>
            <Input
              type="text"
              inputMode="numeric"
              value={data[monthKey][cat.key] || ""}
              onChange={(e) => updateValue(cat.key, e.target.value)}
              placeholder="0"
              className="h-7 text-xs flex-1"
            />
          </div>
        ))}
      </div>

      {/* Navigation + Submit */}
      <div className="flex gap-2 pt-1">
        {currentMonth < 11 ? (
          <Button
            size="sm"
            className="flex-1 rounded-full text-xs"
            onClick={() => setCurrentMonth((p) => p + 1)}
          >
            Next Month →
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 rounded-full text-xs gap-1"
            onClick={handleSubmit}
            disabled={!allFilled}
          >
            <Check className="w-3 h-3" />
            Submit All Data
          </Button>
        )}
      </div>

      {!allFilled && currentMonth === 11 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Fill at least one value per month to submit
        </p>
      )}
    </div>
  );
};

export default ChatDataTable;
