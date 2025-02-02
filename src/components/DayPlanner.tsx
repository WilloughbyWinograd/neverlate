import { useState } from "react";
import StatusHeader from "./StatusHeader";
import PlanInput from "./PlanInput";
import EventList from "./EventList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { parseTimeString, convertToTimezone, calculateEndTime } from "@/utils/timeUtils";

const DayPlanner = () => {
  const [events, setEvents] = useState([]);
  const [isLate, setIsLate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePlanSubmit = async (planText: string) => {
    setIsLoading(true);
    try {
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-plan', {
        body: { planText }
      });

      if (parseError) throw new Error('Failed to parse plan text');
      if (!parsedData?.events || !Array.isArray(parsedData.events)) {
        throw new Error('Invalid response from parse-plan function');
      }

      const processedEvents = await Promise.all(parsedData.events.map(async (event: any) => {
        if (!event.location) {
          throw new Error(`Missing location for event: ${event.activity}`);
        }

        const { data: placeData, error: placeError } = await supabase.functions.invoke('place-details', {
          body: { location: event.location.trim() }
        });

        if (placeError) throw new Error(`Failed to get details for location: ${event.location}`);

        const timezone = placeData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        let startTime;
        try {
          startTime = parseTimeString(event.startTime);
        } catch (error) {
          console.error('Error parsing start time:', error);
          throw new Error(`Invalid time format: ${event.startTime}`);
        }
        
        const endTime = calculateEndTime(startTime, event.endTime);

        // Convert to UTC for storage
        const utcStartTime = convertToTimezone(startTime, timezone, true);
        const utcEndTime = convertToTimezone(endTime, timezone, true);

        const { data: savedEvent, error: saveError } = await supabase
          .from('events')
          .insert([{
            title: event.activity,
            location: event.location,
            start_time: utcStartTime.toISOString(),
            end_time: utcEndTime.toISOString(),
            image_url: placeData.photoUrl || '/placeholder.svg',
          }])
          .select()
          .single();

        if (saveError) throw new Error('Failed to save event to database');

        // Convert UTC times back to local timezone for display
        return {
          ...savedEvent,
          start_time: convertToTimezone(new Date(savedEvent.start_time), timezone).toISOString(),
          end_time: convertToTimezone(new Date(savedEvent.end_time), timezone).toISOString(),
        };
      }));

      setEvents(processedEvents);
      toast({
        title: "Plan created!",
        description: "Your daily plan has been created successfully.",
      });

      if (processedEvents.length > 0) {
        setIsLate(new Date() > new Date(processedEvents[0].start_time));
      }
    } catch (error) {
      console.error('Error processing plan:', error);
      toast({
        title: "Error creating plan",
        description: error.message || "There was a problem creating your plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-planner-100 to-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">NeverLate</h1>
        <StatusHeader 
          isLate={isLate} 
          events={events} 
        />
        <PlanInput onPlanSubmit={handlePlanSubmit} isLoading={isLoading} />
        <EventList events={events} />
      </div>
    </div>
  );
};

export default DayPlanner;