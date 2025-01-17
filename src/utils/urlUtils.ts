/**
 * Returns the base URL for the application based on the current environment
 */
export function getBaseUrl(): string {
  if (import.meta.env.PROD) {
    return 'https://pantrypal-liard.vercel.app';
  }
  return window.location.origin;
}
