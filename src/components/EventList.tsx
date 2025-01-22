import EventCard from "./EventCard";

interface Event {
  id: string;
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  imageUrl: string;
}

interface EventListProps {
  events: Event[];
}

const EventList = ({ events }: EventListProps) => {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          title={event.title}
          location={event.location}
          startTime={event.startTime}
          endTime={event.endTime}
          imageUrl={event.imageUrl}
        />
      ))}
    </div>
  );
};

export default EventList;