import EventCard from "./EventCard";
import TimelineConnector from "./TimelineConnector";
import { useState, useEffect } from "react";

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
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${process.env.GOOGLE_API_KEY}`
            );
            const data = await response.json();
            if (data.results && data.results[0]) {
              setCurrentLocation(data.results[0].formatted_address);
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