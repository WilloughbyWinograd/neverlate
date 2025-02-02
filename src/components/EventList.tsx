import EventCard from "./EventCard";
import TimelineConnector from "./TimelineConnector";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  image_url: string;
}

interface EventListProps {
  events: Event[];
}

const EventList = ({ events }: EventListProps) => {
  const [currentLocation, setCurrentLocation] = useState<string>("Loading location...");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Use Supabase edge function to get location details
            const { data, error } = await supabase.functions.invoke('place-details', {
              body: { 
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }
            });
            
            if (error) throw error;
            if (data?.formattedAddress) {
              setCurrentLocation(data.formattedAddress);
            }
          } catch (error) {
            console.error("Error getting location:", error);
            setCurrentLocation("Current Location");
          }
        },
        () => {
          setCurrentLocation("Current Location");
        }
      );
    }
  }, []);

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div key={event.id}>
          {index === 0 && (
            <TimelineConnector
              fromLocation={currentLocation}
              toLocation={event.location}
              isFirst={true}
            />
          )}
          <EventCard
            title={event.title}
            location={event.location}
            startTime={event.start_time}
            endTime={event.end_time}
            imageUrl={event.image_url}
          />
          {index < events.length - 1 && (
            <TimelineConnector
              fromLocation={event.location}
              toLocation={events[index + 1].location}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default EventList;