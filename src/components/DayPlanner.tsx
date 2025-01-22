import { useState } from "react";
import StatusHeader from "./StatusHeader";
import PlanInput from "./PlanInput";
import EventList from "./EventList";

// Mock function to parse text into events (in real app, this would be more sophisticated)
const parseTextToEvents = (text: string) => {
  // Simple parsing for demo - in reality would use NLP
  const events = text.split(",").map((event, index) => ({
    id: `event-${index}`,
    title: event.trim(),
    location: "Sample Location",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    imageUrl: "/placeholder.svg", // Using placeholder image
  }));
  return events;
};

const DayPlanner = () => {
  const [events, setEvents] = useState([]);
  const [isLate, setIsLate] = useState(false);

  const handlePlanSubmit = (planText: string) => {
    const parsedEvents = parseTextToEvents(planText);
    setEvents(parsedEvents);
    // In real app, would calculate if user is late based on current time and events
    setIsLate(Math.random() > 0.5); // Random for demo
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-planner-100 to-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Daily Plan</h1>
        <StatusHeader isLate={isLate} />
        <PlanInput onPlanSubmit={handlePlanSubmit} />
        <EventList events={events} />
      </div>
    </div>
  );
};

export default DayPlanner;