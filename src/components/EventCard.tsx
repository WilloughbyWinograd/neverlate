import { useState, useEffect } from "react";
import { MapPin, Clock, Car, Train } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

interface EventCardProps {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  imageUrl: string;
}

const EventCard = ({ title, location, startTime, endTime, imageUrl }: EventCardProps) => {
  const [showTransit, setShowTransit] = useState(false);
  const [travelTime, setTravelTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateTravelTime = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('place-details', {
          body: { 
            location, 
            mode: showTransit ? 'transit' : 'driving' 
          }
        });

        if (error) throw error;
        setTravelTime(data.travelTime);
      } catch (error) {
        console.error('Error fetching travel time:', error);
        setTravelTime('Unable to calculate travel time');
      } finally {
        setIsLoading(false);
      }
    };

    updateTravelTime();
  }, [location, showTransit]);

  const fallbackImage = '/placeholder.svg';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 animate-fade-in">
      <div className="relative h-48">
        <img
          src={imageUrl || fallbackImage}
          alt={location}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImage;
          }}
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
            <span>
              {new Date(startTime).toLocaleTimeString()} - {new Date(endTime).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              {showTransit ? <Train className="w-4 h-4" /> : <Car className="w-4 h-4" />}
              <span>{isLoading ? 'Calculating...' : travelTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Transit</span>
              <Switch
                checked={showTransit}
                onCheckedChange={setShowTransit}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;