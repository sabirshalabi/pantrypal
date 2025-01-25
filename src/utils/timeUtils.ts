/**
 * Converts various time formats to human readable format
 * Handles both ISO 8601 duration and simple time strings
 * Examples: 
 * - PT10M -> 10 mins
 * - PT1H30M -> 1 hr 30 mins
 * - 20 min -> 20 mins
 * - 1 hour 30 min -> 1 hr 30 mins
 */
export function formatDuration(duration: string | undefined | null): string {
  if (!duration) return '';

  // If it's already in a simple format (e.g., "20 min"), just normalize it
  if (!duration.startsWith('PT')) {
    // Convert common variations to standard format
    duration = duration.toLowerCase()
      .replace('minutes', 'min')
      .replace('minute', 'min')
      .replace('hours', 'hr')
      .replace('hour', 'hr');
    
    // If it's already in the desired format, return it
    if (/^\d+\s*(min|hr)s?$/.test(duration)) {
      return duration.replace(/(\d+)\s*(min|hr)s?/, (_, num, unit) => {
        const n = parseInt(num);
        return `${n} ${unit}${n === 1 ? '' : 's'}`;
      });
    }
  }

  // Handle ISO 8601 format
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);

  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

  if (hours === 0 && minutes === 0) return '';

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hr' : 'hrs'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'min' : 'mins'}`);
  }

  return parts.join(' ');
}
