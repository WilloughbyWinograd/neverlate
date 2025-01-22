import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PlanInputProps {
  onPlanSubmit: (plan: string) => void;
}

const PlanInput = ({ onPlanSubmit }: PlanInputProps) => {
  const [planText, setPlanText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (planText.trim()) {
      onPlanSubmit(planText);
      setPlanText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-8">
      <Textarea
        placeholder="Enter your plan for the day... (e.g., 'Meeting at coffee shop at 9am, lunch with John at Italian restaurant at 12pm')"
        value={planText}
        onChange={(e) => setPlanText(e.target.value)}
        className="min-h-[100px] bg-white"
      />
      <Button type="submit" className="w-full bg-planner-500 hover:bg-planner-400">
        Create Plan
      </Button>
    </form>
  );
};

export default PlanInput;