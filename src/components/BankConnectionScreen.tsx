import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import MidaLogo from "@/assets/Mida_logo.svg";
import { saveUserData } from "@/lib/userStore";
import type { MonthlyData } from "@/lib/userStore";

const STEPS = [
  "Connecting to your bank...",
  "Authenticating securely...",
  "Fetching transaction history...",
  "Categorizing expenses...",
  "Preparing your financial summary...",
];

const ACTUAL_KEY = "mida_actual_month";

const generateDummyData = (): MonthlyData[] => {
  const base = {
    income: 8500,
    rent: 1800,
    groceries: 950,
    transport: 420,
    leisure: 580,
    utilities: 340,
    health: 280,
    education: 200,
    others: 350,
  };

  return Array.from({ length: 12 }, (_, i) => {
    const variance = () => Math.round((Math.random() - 0.5) * 400);
    const positiveVariance = () => Math.round(Math.random() * 200);
    return {
      month: `M${i + 1}`,
      income: base.income + variance(),
      rent: base.rent + Math.round((Math.random() - 0.5) * 100),
      groceries: base.groceries + variance(),
      transport: base.transport + Math.round((Math.random() - 0.5) * 150),
      leisure: base.leisure + variance(),
      utilities: base.utilities + Math.round((Math.random() - 0.5) * 80),
      health: base.health + positiveVariance(),
      education: base.education + Math.round((Math.random() - 0.5) * 60),
      others: base.others + variance(),
    };
  });
};

const generateDummyActual = () => ({
  income: 8200 + Math.round((Math.random() - 0.5) * 600),
  rent: 1800 + Math.round((Math.random() - 0.5) * 100),
  groceries: 920 + Math.round((Math.random() - 0.5) * 200),
  transport: 390 + Math.round((Math.random() - 0.5) * 100),
  leisure: 540 + Math.round((Math.random() - 0.5) * 150),
  utilities: 320 + Math.round((Math.random() - 0.5) * 60),
  health: 260 + Math.round(Math.random() * 100),
  education: 190 + Math.round((Math.random() - 0.5) * 40),
  others: 310 + Math.round((Math.random() - 0.5) * 120),
});

interface BankConnectionScreenProps {
  userData?: Record<string, string>;
  redirectTo?: string;
}

const BankConnectionScreen = ({ userData = {}, redirectTo }: BankConnectionScreenProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepDuration = 1200;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const target = ((currentStep + 1) / STEPS.length) * 100;
    const timer = setTimeout(() => setProgress(target), 100);
    return () => clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep >= STEPS.length - 1) {
      const timer = setTimeout(() => {
        const dummyData = generateDummyData();
        const allData = { ...userData, dataMethod: "bank", financialData: dummyData } as any;
        saveUserData(allData);

        if (redirectTo) {
          // Also populate the current month actual sliders with dummy bank data
          const actual = generateDummyActual();
          localStorage.setItem(ACTUAL_KEY, JSON.stringify(actual));
          localStorage.setItem("mida_tracker_open", "true");
          navigate(redirectTo);
        } else {
          navigate("/review", { state: { userData: allData, simulated: true } });
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, navigate, userData, redirectTo]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-8 animate-fade-in text-center">
        <img src={MidaLogo} alt="Mida" className="h-12 w-auto mx-auto" />

        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>

          <p className="text-sm font-medium text-foreground animate-pulse-soft">
            {STEPS[currentStep]}
          </p>

          <Progress value={progress} className="h-2" />

          <div className="space-y-1.5 pt-2">
            {STEPS.map((step, i) => (
              <p
                key={i}
                className={`text-xs transition-colors duration-300 ${
                  i < currentStep
                    ? "text-primary"
                    : i === currentStep
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/40"
                }`}
              >
                {i < currentStep ? "✓ " : i === currentStep ? "● " : "○ "}
                {step}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankConnectionScreen;