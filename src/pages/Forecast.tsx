import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, RotateCcw, MessageCircle } from "lucide-react";
import CategorySlider from "@/components/CategorySlider";
import MidaLogo from "@/assets/Mida_logo.svg";
import { loadUserData, hasFinancialData } from "@/lib/userStore";
import { computeForecast, getForecastMonthLabel } from "@/lib/forecastUtils";
import { saveForecastAdjustments, loadForecastAdjustments, clearForecastAdjustments } from "@/lib/forecastStore";

const Forecast = () => {
  const navigate = useNavigate();
  const hasData = hasFinancialData();
  const storedData = loadUserData().financialData;

  const forecast = hasData && storedData ? computeForecast(storedData) : null;
  const forecastLabel = getForecastMonthLabel();

  const INITIAL_CATEGORIES = forecast
    ? [
        { key: "rent", label: "Rent", value: forecast.rent, max: Math.max(forecast.rent * 2, 5000) },
        { key: "groceries", label: "Groceries", value: forecast.groceries, max: Math.max(forecast.groceries * 2, 3000) },
        { key: "transport", label: "Transport", value: forecast.transport, max: Math.max(forecast.transport * 2, 2000) },
        { key: "leisure", label: "Leisure", value: forecast.leisure, max: Math.max(forecast.leisure * 2, 2000) },
        { key: "utilities", label: "Utilities", value: forecast.utilities, max: Math.max(forecast.utilities * 2, 1500) },
        { key: "health", label: "Health", value: forecast.health, max: Math.max(forecast.health * 2, 2000) },
        { key: "education", label: "Education", value: forecast.education, max: Math.max(forecast.education * 2, 2000) },
        { key: "others", label: "Others", value: forecast.others, max: Math.max(forecast.others * 2, 2000) },
      ]
    : [];

  const PREDICTED_INCOME = forecast?.income ?? 0;

  const getInitialCategories = () => {
    const saved = loadForecastAdjustments();
    if (saved && INITIAL_CATEGORIES.length > 0) {
      return INITIAL_CATEGORIES.map((c) => ({
        ...c,
        value: saved[c.key as keyof typeof saved] ?? c.value,
      }));
    }
    return INITIAL_CATEGORIES;
  };

  const [categories, setCategories] = useState(getInitialCategories);
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);

  const isModified = useMemo(
    () => categories.some((c, i) => c.value !== INITIAL_CATEGORIES[i]?.value),
    [categories]
  );

  useEffect(() => {
    if (isModified) {
      const adj: Record<string, number> = {};
      categories.forEach((c) => { adj[c.key] = c.value; });
      saveForecastAdjustments(adj);
    }
  }, [categories, isModified]);

  const totalExpenses = useMemo(
    () => categories.reduce((sum, c) => sum + c.value, 0),
    [categories]
  );

  const remaining = PREDICTED_INCOME - totalExpenses;

  const updateCategory = (key: string, value: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.key === key ? { ...c, value } : c))
    );
  };

  const resetToForecast = useCallback(() => {
    setCategories(INITIAL_CATEGORIES);
    clearForecastAdjustments();
  }, []);

  const handleThumbsUp = () => {
    setFeedbackGiven("up");
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  const handleThumbsDown = () => {
    setFeedbackGiven("down");
  };

  const handleSaveAndProceed = () => {
    if (isModified) {
      const adj: Record<string, number> = {};
      categories.forEach((c) => { adj[c.key] = c.value; });
      saveForecastAdjustments(adj);
    }
    navigate("/dashboard");
  };

  if (!hasData) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 pb-24">
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <img src={MidaLogo} alt="Mida" className="h-8 w-auto" />
          </div>
          <Card className="p-8 text-center space-y-4">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">No financial data yet</h2>
            <p className="text-sm text-muted-foreground">
              Complete your financial data in the chat to see your personalized forecast.
            </p>
            <Button variant="default" className="rounded-full" onClick={() => navigate("/chat")}>
              Go to Chat
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-3">
          <img src={MidaLogo} alt="Mida" className="h-8 w-auto" />
          <div>
            
          </div>
        </div>

        {/* Feedback prompt — now at the top */}
        <Card className="p-4">
          <p className="text-sm font-medium text-foreground mb-1">
            Does this forecast feel realistic for {forecastLabel}?
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Based on your spending history, we estimated your expenses below. Let us know if it looks right.
          </p>

          {feedbackGiven === null && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={handleThumbsUp}
              >
                <ThumbsUp className="w-4 h-4" />
                Looks good
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={handleThumbsDown}
              >
                <ThumbsDown className="w-4 h-4" />
                Needs adjustment
              </Button>
            </div>
          )}

          {feedbackGiven === "up" && (
            <p className="text-sm text-primary font-medium animate-fade-in">
              Great! Taking you to your dashboard...
            </p>
          )}

          {feedbackGiven === "down" && (
            <p className="text-sm text-muted-foreground animate-fade-in">
              Please adjust the values using the bars below.
            </p>
          )}
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Predicted Income</p>
            <p className="text-lg font-bold text-primary">
              ${PREDICTED_INCOME.toLocaleString("en-US")}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-lg font-bold text-foreground">
              ${totalExpenses.toLocaleString("en-US")}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className={`text-lg font-bold ${remaining >= 0 ? "text-primary" : "text-destructive"}`}>
              ${remaining.toLocaleString("en-US")}
            </p>
          </Card>
        </div>

        {/* Sliders */}
        <Card className="p-4 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Expense Breakdown</h2>
          {categories.map((cat) => (
            <CategorySlider
              key={cat.key}
              label={cat.label}
              value={cat.value}
              max={cat.max}
              onChange={(v) => updateCategory(cat.key, v)}
            />
          ))}
        </Card>

        {isModified && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={resetToForecast} className="rounded-full gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              Go back to forecasted expenses
            </Button>
          </div>
        )}

        {/* Save and proceed button — shown after thumbs down or if modified */}
        {(feedbackGiven === "down" || isModified) && (
          <Button
            className="w-full rounded-full"
            onClick={handleSaveAndProceed}
          >
            Save and proceed to Dashboard
          </Button>
        )}

      </div>
    </div>
  );
};

export default Forecast;