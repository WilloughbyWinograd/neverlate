import { Card } from "@/components/ui/card";
import { format } from "date-fns";

interface EventCardProps {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  imageUrl?: string;
}

const EventCard = ({ title, location, startTime, endTime, imageUrl }: EventCardProps) => {
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return format(date, "h:mm a");
  };

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden">
      <div className="relative">
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-xl font-semibold mb-1">{title}</h3>
          <p className="text-sm opacity-90">{location}</p>
          <p className="text-sm opacity-90">
            {formatTime(startTime)} to {formatTime(endTime)}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;