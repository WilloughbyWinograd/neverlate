import { format, parse, set } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const parseTimeString = (timeString: string): Date => {
  // Remove any whitespace and convert to lowercase
  const cleanTimeString = timeString.toLowerCase().trim();
  
  // Match patterns like "3pm", "3:00pm", "15:00", "3:00 pm", "3 pm"
  const timeMatch = cleanTimeString.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  let [, hours, minutes = '0', period] = timeMatch;
  let parsedHours = parseInt(hours, 10);
  const parsedMinutes = parseInt(minutes, 10);

  // Handle 24-hour format
  if (!period && parsedHours >= 0 && parsedHours < 24) {
    return set(new Date(), {
      hours: parsedHours,
      minutes: parsedMinutes,
      seconds: 0,
      milliseconds: 0
    });
  }

  // Handle 12-hour format with am/pm
  if (period) {
    if (period.toLowerCase() === 'pm' && parsedHours < 12) {
      parsedHours += 12;
    } else if (period.toLowerCase() === 'am' && parsedHours === 12) {
      parsedHours = 0;
    }
  }

  if (parsedHours < 0 || parsedHours > 23 || parsedMinutes < 0 || parsedMinutes > 59) {
    throw new Error(`Invalid time values: hours=${parsedHours}, minutes=${parsedMinutes}`);
  }

  return set(new Date(), {
    hours: parsedHours,
    minutes: parsedMinutes,
    seconds: 0,
    milliseconds: 0
  });
};

export const formatEventTime = (date: Date, timezone: string): string => {
  try {
    return formatInTimeZone(date, timezone, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return format(date, 'h:mm a');
  }
};

export const calculateEndTime = (startTime: Date, endTimeString?: string, timezone?: string): Date => {
  if (!endTimeString) {
    // Default to 1 hour duration if no end time specified
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    return endTime;
  }

  try {
    return parseTimeString(endTimeString);
  } catch (error) {
    console.error('Error parsing end time:', error);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    return endTime;
  }
};

export const convertToTimezone = (date: Date, timezone: string, toUTC: boolean = false): Date => {
  if (!date || !timezone) {
    console.error('Missing required parameters:', { date, timezone });
    return date;
  }

  try {
    // Create a date string in the target timezone
    const dateInZone = formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
    
    // Parse it back to a Date object
    return new Date(dateInZone);
  } catch (error) {
    console.error('Error converting timezone:', error);
    return date;
  }
};