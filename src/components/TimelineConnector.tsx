import { Car, Train } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <div className="relative flex items-center my-2 pl-6">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-planner-300" />
      <div className="relative -left-6 bg-white border border-planner-300 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {showTransit ? <Train className="w-4 h-4" /> : <Car className="w-4 h-4" />}
          <span className="font-medium">
            {isFirst ? 'From Home' : 'Next Stop'}
          </span>
          <span className="text-gray-400">•</span>
          <span>{isLoading ? 'Calculating...' : travelTime}</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineConnector;