import { format, parse, set } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const parseTimeString = (timeString: string): Date => {
  // First try to parse as ISO string
  try {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return set(new Date(), {
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: 0,
        milliseconds: 0
      });
    }
  } catch (error) {
    console.log('Not an ISO date, trying human format:', timeString);
  }

  // Parse human-readable format (e.g., "11am", "2pm", "7pm")
  const cleanTimeString = timeString.toLowerCase().trim();
  
  // Handle special case for "sunset" by mapping it to 7pm
  if (cleanTimeString === 'sunset') {
    return set(new Date(), {
      hours: 19,
      minutes: 0,
      seconds: 0,
      milliseconds: 0
    });
  }

  const timeMatch = cleanTimeString.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  let [, hours, minutes = '0', period] = timeMatch;
  let parsedHours = parseInt(hours, 10);
  const parsedMinutes = parseInt(minutes, 10);

  // Handle 12-hour format with am/pm
  if (period) {
    if (period.toLowerCase() === 'pm' && parsedHours < 12) {
      parsedHours += 12;
    } else if (period.toLowerCase() === 'am' && parsedHours === 12) {
      parsedHours = 0;
    }
  }

  // Validate time values
  if (parsedHours < 0 || parsedHours > 23 || parsedMinutes < 0 || parsedMinutes > 59) {
    throw new Error(`Invalid time values: hours=${parsedHours}, minutes=${parsedMinutes}`);
  }

  // Set to today's date with the parsed time
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
    const endTime = parseTimeString(endTimeString);
    // If end time is earlier than start time, assume it's for the next day
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    return endTime;
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
    // Format the date in the target timezone
    const dateString = formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
    // Parse the formatted string back to a Date object
    return new Date(dateString);
  } catch (error) {
    console.error('Error converting timezone:', error);
    return date;
  }
};