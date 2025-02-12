import { Card } from "@/components/ui/card";
import { formatEventTime } from "@/utils/timeUtils";

interface EventCardProps {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  imageUrl?: string;
}

const EventCard = ({ title, location, startTime, endTime, imageUrl }: EventCardProps) => {
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      // Use the browser's timezone as fallback
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return formatEventTime(date, timezone);
    } catch (error) {
      console.error("Error formatting time:", error, timeString);
      return timeString;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden bg-white">
      <div className="relative h-[200px]">
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-2xl font-semibold mb-2">{title}</h3>
          <p className="text-base opacity-90 mb-1">{location}</p>
          <p className="text-sm opacity-90">
            {formatTime(startTime)} - {formatTime(endTime)}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;