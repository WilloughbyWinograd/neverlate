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
            console.log("Getting current location with coordinates:", {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            
            const { data, error } = await supabase.functions.invoke('place-details', {
              body: { 
                lat: position.coords.latitude.toString(),
                lng: position.coords.longitude.toString()
              }
            });
            
            if (error) {
              console.error("Supabase function error:", error);
              throw error;
            }

            console.log("Location data received:", data);
            
            if (data?.formattedAddress) {
              setCurrentLocation(data.formattedAddress);
            }
          } catch (error) {
            console.error("Error getting location:", error);
            setCurrentLocation("Current Location");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setCurrentLocation("Current Location");
        }
      );
    } else {
      console.log("Geolocation not supported");
      setCurrentLocation("Current Location");
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