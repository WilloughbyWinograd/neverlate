import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { parseISO, isAfter, addMinutes, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface StatusHeaderProps {
  isLate: boolean;
  events: Array<{
    start_time: string;
    location: string;
  }>;
  currentLocation: string;
}

const StatusHeader = ({ isLate: initialIsLate, events = [] }: StatusHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLate, setIsLate] = useState(initialIsLate);
  const [transitTimes, setTransitTimes] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTransitTimes = async () => {
      if (!events.length) return;
      
      const times: {[key: string]: number} = {};
      let prevLocation = '';

      for (const event of events) {
        try {
          const { data } = await supabase.functions.invoke('place-details', {
            body: { 
              location: event.location,
              mode: 'driving',
              origin: prevLocation || undefined
            }
          });
          
          if (data?.durationInMinutes) {
            times[event.location] = data.durationInMinutes;
          }
          
          prevLocation = event.location;
        } catch (error) {
          console.error('Error fetching transit time:', error);
        }
      }
      
      setTransitTimes(times);
    };

    fetchTransitTimes();
  }, [events]);

  useEffect(() => {
    if (events && events.length > 0) {
      const nextEvent = events[0];
      const startTime = parseISO(nextEvent.start_time);
      const transitTime = transitTimes[nextEvent.location] || 0;
      const shouldLeaveBy = addMinutes(startTime, -transitTime);
      
      setIsLate(isAfter(currentTime, shouldLeaveBy));
    }
  }, [currentTime, events, transitTimes]);

  return (
    <div className="p-4 w-full max-w-3xl mx-auto mb-6 rounded-lg animate-fade-in bg-white" 
         style={{ backgroundColor: isLate ? "rgb(var(--destructive) / 0.1)" : "rgb(var(--planner) / 0.2)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span className="font-medium">
            {format(currentTime, "h:mm a")}
          </span>
        </div>
        <div className="text-sm font-medium">
          {isLate ? (
            <span className="text-destructive">You're running behind schedule</span>
          ) : (
            <span className="text-green-600">You're on track</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusHeader;