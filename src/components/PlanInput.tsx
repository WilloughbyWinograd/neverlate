import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlayCircle } from "lucide-react";

interface PlanInputProps {
  onPlanSubmit: (plan: string) => void;
  isLoading: boolean;
}

const PlanInput = ({ onPlanSubmit, isLoading }: PlanInputProps) => {
  const [planText, setPlanText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (planText.trim()) {
      onPlanSubmit(planText);
      setPlanText("");
    }
  };

  const handleDemoClick = () => {
    const demoText = "Visit Central Park Zoo at 11am for animal watching. Head to Chelsea Market at 2pm for food exploration. End at Top of the Rock at sunset (7pm) for city views.";
    setPlanText(demoText);
    onPlanSubmit(demoText);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-8">
      <Textarea
        placeholder="Enter your plan for the day... (e.g., 'Meeting at coffee shop at 9am, lunch with John at Italian restaurant at 12pm')"
        value={planText}
        onChange={(e) => setPlanText(e.target.value)}
        className="min-h-[100px] bg-white"
        disabled={isLoading}
      />
      <div className="flex gap-4">
        <Button 
          type="submit" 
          className="flex-1 bg-planner-500 hover:bg-planner-400"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Create Plan'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDemoClick}
          disabled={isLoading}
          className="gap-2"
        >
          <PlayCircle className="h-4 w-4" />
          Try Demo
        </Button>
      </div>
    </form>
  );
};

export default PlanInput;