import { useState } from "react";
import StatusHeader from "./StatusHeader";
import PlanInput from "./PlanInput";
import EventList from "./EventList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";
import { parseTimeString, convertToTimezone, calculateEndTime } from "@/utils/timeUtils";

const DayPlanner = () => {
  const [events, setEvents] = useState([]);
  const [isLate, setIsLate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: "Error logging in",
        description: "There was a problem logging in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setEvents([]);
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error logging out",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlanSubmit = async (planText: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to create plans.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-plan', {
        body: { planText }
      });

      if (parseError) throw new Error('Failed to parse plan text');
      
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

        const { data: placeData, error: placeError } = await supabase.functions.invoke('place-details', {
          body: { location: event.location.trim() }
        });

        if (placeError) throw new Error(`Failed to get details for location: ${event.location}`);

        const timezone = placeData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(`Processing event "${event.activity}" with timezone: ${timezone}`);

        let startTime;
        try {
          startTime = parseTimeString(event.startTime);
          console.log(`Parsed start time for "${event.activity}":`, startTime);
        } catch (error) {
          console.error('Error parsing start time:', error);
          throw new Error(`Invalid time format: ${event.startTime}`);
        }

        const endTime = calculateEndTime(startTime, event.endTime, timezone);
        console.log(`Calculated end time for "${event.activity}":`, endTime);

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
            user_id: user.id
          }])
          .select()
          .single();

        if (saveError) throw new Error('Failed to save event to database');

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

  // Load user's latest events when they log in
  const loadUserEvents = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setEvents(data);
        setIsLate(new Date() > new Date(data[0].start_time));
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error loading events",
        description: "There was a problem loading your events. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-planner-100 to-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center">NeverLate</h1>
          {user ? (
            <Button onClick={handleLogout} variant="outline">
              Sign Out
            </Button>
          ) : (
            <Button onClick={handleLogin} className="bg-planner-500 hover:bg-planner-400">
              Sign in with Google
            </Button>
          )}
        </div>
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