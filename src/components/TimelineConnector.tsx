import { Car, Train } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";

interface TimelineConnectorProps {
  fromLocation: string;
  toLocation: string;
  isFirst?: boolean;
}

const TimelineConnector = ({ fromLocation, toLocation, isFirst = false }: TimelineConnectorProps) => {
  const [showTransit, setShowTransit] = useState(false);
  const [travelTime, setTravelTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateTravelTime = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('place-details', {
          body: { 
            location: toLocation,
            mode: showTransit ? 'transit' : 'driving',
            origin: fromLocation
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
  }, [fromLocation, toLocation, showTransit]);

  const handleGetDirections = () => {
    const modeParam = showTransit ? 'transit' : 'driving';
    const encodedDestination = encodeURIComponent(toLocation);
    const encodedOrigin = encodeURIComponent(fromLocation);
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDestination}&travelmode=${modeParam}`,
      '_blank'
    );
  };

  return (
    <div className="relative flex items-center my-2 pl-6">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-planner-300" />
      <div className="relative -left-6 w-full bg-white border border-planner-300 rounded-lg p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            {showTransit ? <Train className="w-4 h-4" /> : <Car className="w-4 h-4" />}
            <span className="font-medium">
              {isFirst ? 'From Home' : 'Next Stop'}
            </span>
            <span className="text-gray-400">•</span>
            <span>{isLoading ? 'Calculating...' : travelTime}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Transit</span>
              <Switch
                checked={showTransit}
                onCheckedChange={setShowTransit}
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleGetDirections}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineConnector;