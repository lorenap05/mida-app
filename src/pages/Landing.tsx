import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MidaLogo from "@/assets/Mida_logo.svg";
import { hasCompletedOnboarding } from "@/lib/userStore";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (hasCompletedOnboarding()) {
      navigate("/forecast", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="flex flex-col items-center gap-8 animate-fade-in max-w-sm text-center">
        <img src={MidaLogo} alt="Mida" className="h-14 w-auto" />

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Forecast your next month.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Plan with clarity, even when income fluctuates.
          </p>
        </div>

        <Button
          variant="hero"
          size="xl"
          onClick={() => navigate("/chat")}
          className="mt-4 w-full"
        >
          Let's Get Started
        </Button>
      </div>
    </div>
  );
};

export default Landing;
