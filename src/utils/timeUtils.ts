/**
 * Converts ISO 8601 duration format to human readable format
 * Example: PT10M -> 10 mins, PT1H30M -> 1 hr 30 mins
 */
export function formatDuration(duration: string | undefined): string {
  if (!duration) return '';

  // Match hours and minutes from the duration string
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
