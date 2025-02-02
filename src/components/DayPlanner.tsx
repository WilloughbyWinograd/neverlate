import { useState } from "react";
import StatusHeader from "./StatusHeader";
import PlanInput from "./PlanInput";
import EventList from "./EventList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { parseTimeString, convertToTimezone, calculateEndTime, formatEventTime } from "@/utils/timeUtils";

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
      
      // Handle the case where no valid schedule was found
      if (parsedData.error === 'No schedule discernible') {
        toast({
          title: "Invalid plan",
          description: "No valid schedule could be created from your input. Please provide location-based activities.",
          variant: "destructive",
        });
        setEvents([]);
        return;
      }

      if (!parsedData?.events || !Array.isArray(parsedData.events)) {
        throw new Error('Invalid response from parse-plan function');
      }

      const processedEvents = await Promise.all(parsedData.events.map(async (event: any) => {
        if (!event.location) {
          throw new Error(`Missing location for event: ${event.activity}`);
        }

        // Get place details including timezone for the event location
        const { data: placeData, error: placeError } = await supabase.functions.invoke('place-details', {
          body: { location: event.location.trim() }
        });

        if (placeError) throw new Error(`Failed to get details for location: ${event.location}`);

        // Use the location's timezone, fallback to local timezone if not available
        const timezone = placeData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(`Processing event "${event.activity}" with timezone: ${timezone}`);

        // Parse the time string and ensure it's set to today's date
        let startTime;
        try {
          startTime = parseTimeString(event.startTime);
          console.log(`Parsed start time for "${event.activity}":`, startTime);
        } catch (error) {
          console.error('Error parsing start time:', error);
          throw new Error(`Invalid time format: ${event.startTime}`);
        }

        // Calculate end time in the same timezone
        const endTime = calculateEndTime(startTime, event.endTime, timezone);
        console.log(`Calculated end time for "${event.activity}":`, endTime);

        // Convert times to UTC for storage
        const utcStartTime = convertToTimezone(startTime, timezone, true);
        const utcEndTime = convertToTimezone(endTime, timezone, true);

        console.log(`Converted times to UTC for "${event.activity}":`, {
          start: utcStartTime,
          end: utcEndTime
        });

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