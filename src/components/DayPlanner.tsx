import { useState } from "react";
import StatusHeader from "./StatusHeader";
import PlanInput from "./PlanInput";
import EventList from "./EventList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { parseISO, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const DayPlanner = () => {
  const [events, setEvents] = useState([]);
  const [isLate, setIsLate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("Current Location");
  const { toast } = useToast();

  const handlePlanSubmit = async (planText: string) => {
    setIsLoading(true);
    try {
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-plan', {
        body: { planText }
      });

      if (parseError) {
        console.error('Parse error:', parseError);
        throw new Error('Failed to parse plan text');
      }

      if (!parsedData?.events || !Array.isArray(parsedData.events)) {
        throw new Error('Invalid response from parse-plan function');
      }

      // For each parsed event, get place details and save to database
      const processedEvents = await Promise.all(parsedData.events.map(async (event: any) => {
        if (!event.location) {
          console.warn('Event missing location:', event);
          throw new Error(`Missing location for event: ${event.activity}`);
        }

        // Get place details including timezone and travel time
        const { data: placeData, error: placeError } = await supabase.functions.invoke('place-details', {
          body: { 
            location: event.location.trim(),
            mode: 'driving'
          }
        });

        if (placeError) {
          console.error('Place details error:', placeError);
          throw new Error(`Failed to get details for location: ${event.location}`);
        }

        // Convert local time to UTC for storage
        const timezone = placeData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localStartTime = parseISO(`${format(new Date(), 'yyyy-MM-dd')}T${event.startTime}`);
        const localEndTime = parseISO(`${format(new Date(), 'yyyy-MM-dd')}T${event.endTime}`);
        
        const utcStartTime = fromZonedTime(localStartTime, timezone);
        const utcEndTime = fromZonedTime(localEndTime, timezone);

        // Save event to database without user_id
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

        if (saveError) {
          console.error('Save error:', saveError);
          throw new Error('Failed to save event to database');
        }

        // Convert UTC times back to local for display
        return {
          ...savedEvent,
          start_time: toZonedTime(savedEvent.start_time, timezone).toISOString(),
          end_time: toZonedTime(savedEvent.end_time, timezone).toISOString(),
        };
      }));

      setEvents(processedEvents);
      toast({
        title: "Plan created!",
        description: "Your daily plan has been created successfully.",
      });

      // Simple late calculation based on current time vs first event
      if (processedEvents.length > 0) {
        const firstEventTime = new Date(processedEvents[0].start_time);
        setIsLate(new Date() > firstEventTime);
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
          currentLocation={currentLocation}
        />
        <PlanInput onPlanSubmit={handlePlanSubmit} isLoading={isLoading} />
        <EventList events={events} />
      </div>
    </div>
  );
};

export default DayPlanner;