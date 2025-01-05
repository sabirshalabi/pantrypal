export const checkPWAStatus = () => {
  // Check if service worker is supported
  const isServiceWorkerSupported = 'serviceWorker' in navigator;
  console.log('Service Worker supported:', isServiceWorkerSupported);

  // Check if app is installed
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
  console.log('App is installed:', isInstalled);

  // Check if app can be installed (PWA criteria met)
  const isInstallable = window.BeforeInstallPromptEvent !== undefined;
  console.log('App is installable:', isInstallable);

  // Check manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  console.log('Manifest found:', !!manifestLink);

  // Check service worker registration
  if (isServiceWorkerSupported) {
    navigator.serviceWorker.getRegistration()
      .then(registration => {
        console.log('Service Worker registration:', registration ? 'Active' : 'Not found');
        if (registration) {
          console.log('Service Worker state:', registration.active ? 'Active' : 'Installing/Waiting');
        }
      });
  }

  // Check cache storage
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      console.log('Cache stores:', cacheNames);
    });
  }
};
