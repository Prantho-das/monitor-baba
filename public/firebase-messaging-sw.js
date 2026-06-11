// Scripts for firebase-messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// These variables will be replaced/provided during deployment, or can be hardcoded by the user.
// To keep it dynamic, we read configuration parameters from URL parameters if provided, or fallback to default config.
const urlParams = new URL(location.href).searchParams;
const apiKey = urlParams.get('apiKey');
const projectId = urlParams.get('projectId');
const messagingSenderId = urlParams.get('messagingSenderId');
const appId = urlParams.get('appId');

const firebaseConfig = {
  apiKey: apiKey || '',
  projectId: projectId || '',
  messagingSenderId: messagingSenderId || '',
  appId: appId || '',
};

if (firebaseConfig.messagingSenderId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);

    const notificationTitle = payload.notification?.title || 'Server Alert';
    const notificationOptions = {
      body: payload.notification?.body || 'A server notification was received.',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'server-alert',
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('Firebase Messaging SW: messagingSenderId not found in query string. Background push will load with custom configuration fallback.');
}

// Handle notification click to focus or open app dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const serverId = event.notification.data?.serverId;
  const targetUrl = serverId ? `/servers/${serverId}` : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find matching window if open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Or open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
