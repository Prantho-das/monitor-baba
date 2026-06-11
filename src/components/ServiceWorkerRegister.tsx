'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          // Pass firebase configuration parameters to the service worker registration URL
          // so the service worker compat script can access them dynamically!
          const apiKey = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
          const projectId = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '');
          const messagingSenderId = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '');
          const appId = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '');
          
          const swUrl = `/firebase-messaging-sw.js?apiKey=${apiKey}&projectId=${projectId}&messagingSenderId=${messagingSenderId}&appId=${appId}`;

          const registration = await navigator.serviceWorker.register(swUrl, {
            scope: '/',
          });
          console.log('Firebase Messaging Service Worker registered successfully with scope:', registration.scope);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      registerServiceWorker();
    }
  }, []);

  return null;
}
