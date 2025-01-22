import { useState } from "react";
import { MapPin, Clock, Car, Train } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface EventCardProps {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  imageUrl: string;
}

const EventCard = ({ title, location, startTime, endTime, imageUrl }: EventCardProps) => {
  const [showTransit, setShowTransit] = useState(false);
  const travelTime = showTransit ? "25 mins by transit" : "15 mins by car";

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 animate-fade-in">
      <div className="relative h-32">
        <img
          src={imageUrl}
          alt={location}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{startTime} - {endTime}</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              {showTransit ? <Train className="w-4 h-4" /> : <Car className="w-4 h-4" />}
              <span>{travelTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Transit</span>
              <Switch
                checked={showTransit}
                onCheckedChange={setShowTransit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;