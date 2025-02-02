import { set, addHours } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const parseTimeString = (timeString: string): Date => {
  const timeMatch = timeString.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  let [, hours, minutes = '0', period] = timeMatch;
  let parsedHours = parseInt(hours);
  const parsedMinutes = parseInt(minutes);

  // Convert to 24-hour format if needed
  if (period) {
    if (period === 'pm' && parsedHours < 12) parsedHours += 12;
    if (period === 'am' && parsedHours === 12) parsedHours = 0;
  }

  return set(new Date(), {
    hours: parsedHours,
    minutes: parsedMinutes,
    seconds: 0,
    milliseconds: 0
  });
};

export const convertToTimezone = (date: Date, timezone: string, toUTC: boolean = false) => {
  return toUTC ? 
    fromZonedTime(date, timezone) :
    toZonedTime(date, timezone);
};

export const calculateEndTime = (startTime: Date, endTimeString?: string): Date => {
  if (!endTimeString) return addHours(startTime, 1);
  
  try {
    return parseTimeString(endTimeString);
  } catch (error) {
    console.error('Error parsing end time:', error);
    return addHours(startTime, 1);
  }
};