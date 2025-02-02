import EventCard from "./EventCard";

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
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          title={event.title}
          location={event.location}
          startTime={event.start_time}
          endTime={event.end_time}
          imageUrl={event.image_url}
        />
      ))}
    </div>
  );
};

export default EventList;