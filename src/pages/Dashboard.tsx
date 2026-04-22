import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, ChevronLeft, ChevronRight, Sparkles,
  TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp,
  AlertTriangle, Link2, ThumbsUp, ThumbsDown, Target,
} from "lucide-react";
import MidaLogo from "@/assets/Mida_logo.svg";
import { loadUserData, hasFinancialData, saveUserData } from "@/lib/userStore";
import type { MonthlyData } from "@/lib/userStore";
import { getMonthLabel, getForecastMonthLabel, computeForecast } from "@/lib/forecastUtils";
import { loadForecastAdjustments } from "@/lib/forecastStore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceArea, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActualEntry {
  rent: number; groceries: number; transport: number; leisure: number;
  utilities: number; health: number; education: number; others: number;
  income: number;
}

const ACTUAL_KEY = "mida_actual_month";
const CATEGORIES = ["rent", "groceries", "transport", "leisure", "utilities", "health", "education", "others"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  rent: "Rent", groceries: "Groceries", transport: "Transport", leisure: "Leisure",
  utilities: "Utilities", health: "Health", education: "Education", others: "Others",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loadActualEntry = (): ActualEntry | null => {
  try { const raw = localStorage.getItem(ACTUAL_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};

const saveActualEntry = (entry: ActualEntry) => localStorage.setItem(ACTUAL_KEY, JSON.stringify(entry));

const buildChartData = (financialData: MonthlyData[]) => {
  const forecast = computeForecast(financialData);
  const adj = loadForecastAdjustments();
  const adjustedForecast = adj
    ? { ...forecast, ...Object.fromEntries(CATEGORIES.map((k) => [k, (adj as any)[k] ?? (forecast as any)[k]])) }
    : forecast;
  const all = [...financialData, adjustedForecast];
  return all.map((d, i) => ({
    month: d.month,
    label: d.month === "M13" ? `${getForecastMonthLabel()}*` : getMonthLabel(d.month),
    idx: i,
    income: d.income,
    expenses: CATEGORIES.reduce((s, k) => s + (d[k] as number), 0),
    ...Object.fromEntries(CATEGORIES.map((k) => [k, d[k]])),
    isForecast: d.month === "M13",
  }));
};

// ─── Advice ───────────────────────────────────────────────────────────────────

const generateAdvice = (
  planned: Record<Category, number>,
  actual: ActualEntry,
  plannedIncome: number,
): { tip: string; category: string; trend: "over" | "under" | "on" }[] => {
  const tips: { tip: string; category: string; trend: "over" | "under" | "on" }[] = [];

  CATEGORIES.forEach((cat) => {
    const plan = planned[cat];
    const act = actual[cat];
    if (!act || plan === 0) return;
    const diff = act - plan;
    const pct = Math.abs(diff) / plan;
    if (pct > 0.15) {
      if (diff > 0) {
        let msg = `You're $${diff.toLocaleString("en-US")} over your ${CATEGORY_LABELS[cat].toLowerCase()} plan.`;
        if (cat === "leisure") msg += " Cutting back on non-essential outings could help.";
        else if (cat === "groceries") msg += " Meal planning or buying in bulk could reduce this.";
        else if (cat === "transport") msg += " Combining trips or fewer ride-shares would help.";
        else if (cat === "others") msg += " Review miscellaneous items for anything you can delay.";
        tips.push({ tip: msg, category: CATEGORY_LABELS[cat], trend: "over" });
      } else {
        tips.push({
          tip: `Great discipline on ${CATEGORY_LABELS[cat].toLowerCase()}! $${Math.abs(diff).toLocaleString("en-US")} under plan — a buffer you could direct to savings.`,
          category: CATEGORY_LABELS[cat],
          trend: "under",
        });
      }
    }
  });

  if (actual.income > 0 && plannedIncome > 0) {
    const d = actual.income - plannedIncome;
    if (Math.abs(d) / plannedIncome > 0.1) {
      tips.push(
        d < 0
          ? { tip: `Income came in $${Math.abs(d).toLocaleString("en-US")} below forecast. Prioritise fixed costs and hold off on discretionary spending.`, category: "Income", trend: "over" }
          : { tip: `Income is $${d.toLocaleString("en-US")} above forecast. A good moment to top up your emergency fund.`, category: "Income", trend: "under" }
      );
    }
  }

  if (tips.length === 0) {
    tips.push({ tip: "You're tracking closely to plan. Keep it up and review again at month end.", category: "Overall", trend: "on" });
  }
  return tips;
};

// ─── Actual Slider ────────────────────────────────────────────────────────────

interface ActualSliderProps {
  label: string;
  planned: number;
  actual: number;
  onChange: (v: number) => void;
}

const ActualSlider = ({ label, planned, actual, onChange }: ActualSliderProps) => {
  const max = Math.max(planned * 2, 500);
  const ratio = planned > 0 ? actual / planned : 0;
  const isOver = ratio >= 1.0 && actual > 0;
  const isWarning = ratio >= 0.85 && ratio < 1.0 && actual > 0;

  const trackColor = isOver
    ? "hsl(0, 72%, 51%)"
    : isWarning
    ? "hsl(38, 92%, 50%)"
    : "hsl(38, 72%, 54%)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {planned > 0 && (
            <span className="text-[10px] text-muted-foreground/50">
              plan ${planned.toLocaleString("en-US")}
            </span>
          )}
          <span className={`text-sm font-semibold tabular-nums ${isOver ? "text-destructive" : isWarning ? "text-amber-500" : "text-foreground"}`}>
            ${actual.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      {isOver && (
        <div className="flex items-center gap-1.5 text-destructive animate-fade-in">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="text-[10px]">Over budget by ${(actual - planned).toLocaleString("en-US")}</span>
        </div>
      )}
      {isWarning && (
        <div className="flex items-center gap-1.5 text-amber-500 animate-fade-in">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="text-[10px]">Approaching your plan limit</span>
        </div>
      )}

      <div className="relative">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${Math.min((actual / max) * 100, 100)}%`, backgroundColor: trackColor }}
          />
        </div>
        {planned > 0 && planned <= max && (
          <div
            className="absolute top-0 w-0.5 h-2 bg-muted-foreground/40 rounded-full pointer-events-none"
            style={{ left: `${(planned / max) * 100}%`, transform: "translateX(-50%)" }}
          />
        )}
        <input
          type="range" min={0} max={max} step={10} value={actual}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
        />
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const hasData = hasFinancialData();
  const userData = loadUserData();
  const financialData = userData.financialData;
  const userGoal = userData.goals;
  const userName = userData.name;
  const monthlyData = hasData && financialData ? buildChartData(financialData) : [];

  const [selectedIdx, setSelectedIdx] = useState(monthlyData.length > 0 ? monthlyData.length - 1 : 0);
  const [trackerOpen, setTrackerOpen] = useState(() => {
  const flag = localStorage.getItem("mida_tracker_open");
  if (flag) localStorage.removeItem("mida_tracker_open");
  return flag === "true";
  });
  const [adviceVisible, setAdviceVisible] = useState(false);
  const [adviceFeedback, setAdviceFeedback] = useState<"up" | "down" | null>(null);

  const forecastEntry = monthlyData.find((d) => d.isForecast);

  const [actual, setActual] = useState<ActualEntry>(() => {
    const saved = loadActualEntry();
    return saved ?? { rent: 0, groceries: 0, transport: 0, leisure: 0, utilities: 0, health: 0, education: 0, others: 0, income: 0 };
  });

  const selectedData = monthlyData[selectedIdx];
  const isForecastSelected = selectedData?.isForecast ?? false;

  const categoryData = selectedData
    ? CATEGORIES.map((k) => ({ category: CATEGORY_LABELS[k], amount: selectedData[k] as number })).sort((a, b) => b.amount - a.amount)
    : [];

  const handleChartClick = (data: any) => {
    if (data?.activeLabel !== undefined) {
      const idx = Number(data.activeLabel);
      if (idx >= 0 && idx < monthlyData.length) setSelectedIdx(idx);
    }
  };

  const updateActual = (key: keyof ActualEntry, value: number) => {
    setActual((prev) => { const u = { ...prev, [key]: value }; saveActualEntry(u); return u; });
  };

  const handleSaveActual = () => {
    if (!financialData || !forecastEntry) return;
    const actualMonth: MonthlyData = {
      month: "M13",
      income: actual.income || forecastEntry.income,
      ...Object.fromEntries(CATEGORIES.map((k) => [k, actual[k] || (forecastEntry[k] as number)])),
    } as MonthlyData;
    const shifted = [...financialData.slice(1), { ...actualMonth, month: "M12" }].map((d, i) => ({ ...d, month: `M${i + 1}` }));
    saveUserData({ financialData: shifted });
    localStorage.removeItem(ACTUAL_KEY);
    alert("Month saved! Your historical data has been updated.");
  };

  const totalActualExpenses = CATEGORIES.reduce((s, k) => s + actual[k], 0);
  const anyActualEntered = CATEGORIES.some((k) => actual[k] > 0) || actual.income > 0;
  const forecastTotalExpenses = forecastEntry ? CATEGORIES.reduce((s, k) => s + (forecastEntry[k] as number), 0) : 0;
  const spendingRatio = forecastTotalExpenses > 0 ? totalActualExpenses / forecastTotalExpenses : 0;
  const trackingStatus: { label: string; style: string } = !anyActualEntered
    ? { label: "", style: "" }
    : spendingRatio > 1.0
    ? { label: "Needs attention", style: "bg-destructive/10 text-destructive" }
    : spendingRatio > 0.85
    ? { label: "Active", style: "bg-amber-100 text-amber-700" }
    : { label: "On track", style: "bg-primary/10 text-primary" };

  const plannedForAdvice = Object.fromEntries(CATEGORIES.map((k) => [k, (forecastEntry?.[k] as number) ?? 0])) as Record<Category, number>;
  const advice = generateAdvice(plannedForAdvice, actual, forecastEntry?.income ?? 0);
  const forecastLabel = getForecastMonthLabel();
  const selectedLabel = selectedData?.label ?? "";

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
            <p className="text-sm text-muted-foreground">Complete your financial data in the chat to see your dashboard.</p>
            <Button variant="default" className="rounded-full" onClick={() => navigate("/chat")}>Go to Chat</Button>
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
        </div>

        {/* ── Goal tracking card ── */}
        {userGoal && (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-semibold text-foreground">Your Goal</h2>
            </div>
            <p className="text-sm text-foreground font-medium">{userGoal}</p>
            {forecastEntry && (() => {
              const forecastRemaining = forecastEntry.income - CATEGORIES.reduce((s, k) => s + (forecastEntry[k] as number), 0);
              const isOnTrack = forecastRemaining >= 0;
              return (
                <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${isOnTrack ? "bg-primary/8" : "bg-destructive/8"}`}>
                  <p className={`text-xs leading-relaxed ${isOnTrack ? "text-primary" : "text-destructive"}`}>
                    {isOnTrack
                      ? `${userName ? userName + ", you're" : "You're"} on track this month — your forecast shows $${forecastRemaining.toLocaleString("en-US")} left over. A great opportunity to put that toward your goal.`
                      : `Your forecast shows expenses above income this month. Let's review your spending to get back on track.`}
                  </p>
                </div>
              );
            })()}
            <button
              className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
              onClick={() => navigate("/chat")}
            >
              Talk to Mida about your goal →
            </button>
          </Card>
        )}

        {/* ── Actual vs Plan — collapsed at top ── */}
        {forecastEntry && (
          <Card className="overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setTrackerOpen((v) => !v)}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">Track Current Month</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {anyActualEntered
                    ? `$${totalActualExpenses.toLocaleString("en-US")} recorded so far this month`
                    : "Log your actual spending as the month progresses"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {anyActualEntered && trackingStatus.label && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trackingStatus.style}`}>{trackingStatus.label}</span>
                )}
                {trackerOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {trackerOpen && (
              <div className="px-4 pb-5 space-y-5 border-t border-border animate-fade-in">

                {/* Bank connect nudge */}
                <div className="flex items-center justify-between pt-3 rounded-lg bg-muted/40 -mx-4 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground">Skip manual entry — connect your bank to auto-fill.</p>
                  <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 h-7 px-2 shrink-0" onClick={() => navigate("/bank-connect")}>
                    <Link2 className="w-3 h-3" />
                    Connect
                  </Button>
                </div>

                {/* Income slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Income</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/50">plan ${forecastEntry.income.toLocaleString("en-US")}</span>
                      <span className="text-sm font-semibold text-primary tabular-nums">${actual.income.toLocaleString("en-US")}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-150" style={{ width: `${Math.min((actual.income / Math.max(forecastEntry.income * 2, 5000)) * 100, 100)}%` }} />
                    </div>
                    <input type="range" min={0} max={Math.max(forecastEntry.income * 2, 5000)} step={50} value={actual.income} onChange={(e) => updateActual("income", Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer h-2" />
                  </div>
                </div>

                <div className="border-t border-border" />

                {CATEGORIES.map((cat) => (
                  <ActualSlider
                    key={cat}
                    label={CATEGORY_LABELS[cat]}
                    planned={forecastEntry[cat] as number}
                    actual={actual[cat]}
                    onChange={(v) => updateActual(cat, v)}
                  />
                ))}

                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total expenses logged</span>
                  <span className="text-sm font-semibold text-foreground">${totalActualExpenses.toLocaleString("en-US")}</span>
                </div>

                <Button variant="outline" size="sm" className="w-full rounded-full" onClick={handleSaveActual}>
                  Save as this month's data point
                </Button>
              </div>
            )}
          </Card>
        )}

{/* ── Smart spending tips ── */}
        {forecastEntry && (
          <Card className="p-4 space-y-3">
            <button className="flex items-center gap-2 w-full text-left" onClick={() => setAdviceVisible((v) => !v)}>
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-semibold text-foreground flex-1">Smart spending tips</h2>
              <span className="text-xs text-muted-foreground">{adviceVisible ? "Hide" : "Show"}</span>
            </button>
            {adviceVisible && (
              <div className="space-y-3 animate-fade-in">
                {advice.map((a, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={`mt-0.5 shrink-0 ${a.trend === "over" ? "text-destructive" : a.trend === "under" ? "text-primary" : "text-muted-foreground"}`}>
                      {a.trend === "over" ? <TrendingUp className="w-4 h-4" /> : a.trend === "under" ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{a.category}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{a.tip}</p>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground italic pt-1">Tips update as you log spending above.</p>

                {/* Feedback row */}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground flex-1">Was this helpful?</p>
                  <Button
                    variant={adviceFeedback === "up" ? "default" : "outline"}
                    size="icon"
                    className="rounded-full h-7 w-7"
                    onClick={() => setAdviceFeedback("up")}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant={adviceFeedback === "down" ? "default" : "outline"}
                    size="icon"
                    className="rounded-full h-7 w-7"
                    onClick={() => setAdviceFeedback("down")}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </Button>
                  {adviceFeedback && (
                    <span className="text-xs text-muted-foreground animate-fade-in">
                      {adviceFeedback === "up" ? "Glad it helped!" : "We're improving this"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Income vs Expenses chart ── */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} onClick={handleChartClick} style={{ cursor: "pointer" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 89%)" />
              <ReferenceArea x1={11.5} x2={12.5} fill="hsl(48, 96%, 80%)" fillOpacity={0.5} ifOverflow="extendDomain" />
              <XAxis dataKey="idx" type="number" domain={[-0.5, 12.5]} ticks={[0,1,2,3,4,5,6,7,8,9,10,11,12]} tickFormatter={(v) => monthlyData[v]?.label ?? ""} tick={{ fontSize: 9, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip labelFormatter={(idx) => monthlyData[idx]?.label ?? ""} formatter={(value: number, name: string) => [`$${value.toLocaleString("en-US")}`, name === "income" ? "Income" : "Expenses"]} contentStyle={{ backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(40, 15%, 89%)", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="income" stroke="hsl(38, 72%, 54%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(38, 72%, 54%)" }} name="income" />
              <Line type="monotone" dataKey="expenses" stroke="hsl(220, 10%, 46%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(220, 10%, 46%)" }} name="expenses" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-primary rounded" /><span className="text-xs text-muted-foreground">Income</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-muted-foreground rounded" /><span className="text-xs text-muted-foreground">Expenses</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(48, 96%, 80%)", opacity: 0.5 }} /><span className="text-xs text-muted-foreground">Forecast*</span></div>
          </div>
        </Card>

        {/* ── Spending by category ── */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Spending by Category</h2>
          <div className="border-t border-border" />
          <div className="flex items-center justify-center gap-3 py-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === 0} onClick={() => setSelectedIdx((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium text-foreground min-w-[80px] text-center">{selectedLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === monthlyData.length - 1} onClick={() => setSelectedIdx((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString("en-US")}`]} separator="" contentStyle={{ backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(40, 15%, 89%)", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={18}>
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={isForecastSelected ? "hsl(200, 60%, 50%)" : "hsl(38, 72%, 54%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {isForecastSelected && <p className="text-[10px] text-muted-foreground text-center mt-1 italic">* Forecast based on your historical patterns</p>}
        </Card>


      </div>
    </div>
  );
};

export default Dashboard;