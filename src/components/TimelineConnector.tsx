import { CarFront, Train, Navigation } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface TimelineConnectorProps {
  fromLocation: string;
  toLocation: string;
  isFirst?: boolean;
}

const TimelineConnector = ({ fromLocation, toLocation, isFirst = false }: TimelineConnectorProps) => {
  const [showTransit, setShowTransit] = useState(false);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateTravelTime = async () => {
      setIsLoading(true);
      try {
        // Don't make the API call if we don't have valid locations yet
        if (!fromLocation || !toLocation || 
            fromLocation === "Loading location..." || 
            toLocation === "Loading location...") {
          console.log("Waiting for valid locations...");
          return;
        }

        console.log("Fetching travel time for:", { fromLocation, toLocation, mode: showTransit ? 'transit' : 'driving' });

        const { data, error } = await supabase.functions.invoke('place-details', {
          body: { 
            origin: fromLocation,
            destination: toLocation,
            mode: showTransit ? 'transit' : 'driving'
          }
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }

        if (!data?.travelTime) {
          console.error('No travel time in response:', data);
          throw new Error('No travel time available');
        }

        setTravelTime(data.travelTime);
      } catch (error) {
        console.error('Error fetching travel time:', error);
        setTravelTime('Unable to calculate');
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
    <div className="relative flex items-center my-4 w-full max-w-3xl mx-auto">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-planner-300" />
      <div className="w-full bg-white border border-planner-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 min-w-0">
            {showTransit ? <Train className="w-4 h-4 flex-shrink-0" /> : <CarFront className="w-4 h-4 flex-shrink-0" />}
            <span className="font-medium whitespace-nowrap">
              {isFirst ? 'From Current Location' : 'Next Stop'}
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="truncate">
              {isLoading ? 'Calculating...' : travelTime}
            </span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">Public Transit</span>
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
              className="gap-2 whitespace-nowrap"
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