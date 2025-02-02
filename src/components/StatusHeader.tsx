import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";

interface StatusHeaderProps {
  isLate: boolean;
}

const StatusHeader = ({ isLate }: StatusHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${process.env.GOOGLE_API_KEY}&result_type=locality`
            );
            const data = await response.json();
            if (data.results && data.results[0]) {
              setCurrentLocation(data.results[0].formatted_address);
            } else {
              setCurrentLocation("Location not found");
            }
          } catch (error) {
            console.error("Error getting location:", error);
            setCurrentLocation("Unable to get location");
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          console.error("Error getting position:", error);
          setCurrentLocation("Location access denied");
          setLocationLoading(false);
        }
      );
    } else {
      setCurrentLocation("Geolocation not supported");
      setLocationLoading(false);
    }

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`p-4 ${isLate ? "bg-destructive/10" : "bg-planner-200"} rounded-lg mb-6 animate-fade-in`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <span className="font-medium text-sm">
              {locationLoading ? "Getting location..." : currentLocation}
            </span>
          </div>
        </div>
        <div className="text-sm font-medium">
          {isLate ? (
            <span className="text-destructive">You're running behind schedule</span>
          ) : (
            <span className="text-green-600">You're on track</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusHeader;