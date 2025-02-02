import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { parseISO, isAfter, addMinutes } from "date-fns";

interface StatusHeaderProps {
  isLate: boolean;
  events: Array<{
    start_time: string;
    location: string;
  }>;
  currentLocation: string;
}

const StatusHeader = ({ isLate: _, events, currentLocation }: StatusHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLate, setIsLate] = useState(false);
  const [transitTimes, setTransitTimes] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTransitTimes = async () => {
      const times: {[key: string]: number} = {};
      let prevLocation = currentLocation;

      for (const event of events) {
        try {
          const { data } = await supabase.functions.invoke('place-details', {
            body: { 
              location: event.location,
              mode: 'driving',
              origin: prevLocation
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
  }, [events, currentLocation]);

  useEffect(() => {
    if (events.length > 0) {
      const nextEvent = events[0];
      const startTime = parseISO(nextEvent.start_time);
      const transitTime = transitTimes[nextEvent.location] || 0;
      const shouldLeaveBy = addMinutes(startTime, -transitTime);
      
      setIsLate(isAfter(currentTime, shouldLeaveBy));
    }
  }, [currentTime, events, transitTimes]);

  return (
    <div className={`p-4 ${isLate ? "bg-destructive/10" : "bg-planner-200"} rounded-lg mb-6 animate-fade-in max-w-3xl mx-auto`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <span className="font-medium text-sm">
              {currentLocation}
            </span>
          </div>
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